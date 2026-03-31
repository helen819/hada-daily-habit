package com.preson88.hada

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.preson88.hada.R
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        // goAsync로 비동기 작업 허용
        val pendingResult = goAsync()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = callGeminiAndSave(context)
                sendNotification(context, result.first, result.second)
            } catch (e: Exception) {
                sendNotification(
                    context,
                    "오늘의 에너지를 확인하세요 ✨",
                    "HADA가 오늘의 리딩을 준비했어요"
                )
            } finally {
                // onReceive finally 블록 안
                val dayOffset = intent.getIntExtra("day_offset", 1)

// 앱이 실행되지 않은 경우 → 이 슬롯을 7일 뒤로 재예약
// 앱이 실행된 경우 → scheduleWeeklyAlarms가 덮어쓰므로 무시됨
                DailyAlarmPlugin.rescheduleOneDayAfterWeek(context, dayOffset)
                pendingResult.finish()
            }
        }
    }

    private suspend fun callGeminiAndSave(context: Context): Pair<String, String> {
        val prefs = context.getSharedPreferences("CAPPrefs", Context.MODE_PRIVATE)
        val today = getKSTDateString()

        // ✅ [추가] 이미 오늘 데이터가 있는지 확인
        val existingJson = prefs.getString("CAP_local-app_entity_DailyReading", "[]")
        val existingArray = JSONArray(existingJson)
        for (i in 0 until existingArray.length()) {
            val item = existingArray.getJSONObject(i)
            if (item.optString("date") == today) {
                // 이미 데이터가 있다면 LLM 호출 없이 기존 데이터 반환
                val todayHint = item.optString("today_hint", "오늘의 에너지를 확인하세요 ✨")
                val cardTitle = item.optJSONObject("mode_card")?.optString("card_title")
                    ?: "HADA가 오늘의 리딩을 준비했어요"
                return Pair(todayHint, cardTitle)
            }
        }
        // ── API 키 읽기 ──────────────────────────────────────
        val apiKeyRaw = prefs.getString("CAP_local-app_setting_gemini_api_key", null)
            ?: throw Exception("API 키 없음")
        val apiKey = apiKeyRaw.removeSurrounding("\"")

        // ── UserProfile 읽기 ─────────────────────────────────
        val profileJson = prefs.getString("CAP_local-app_entity_UserProfile", "[]")
        val profiles = JSONArray(profileJson)
        if (profiles.length() == 0) throw Exception("프로필 없음")
        val profile = profiles.getJSONObject(0)
        val currentMode = profile.optString("current_mode", "action")

        // ── 목표 리스트 (JS 로직 재현) ──
        val goalsJson = prefs.getString("CAP_local-app_entity_Goal", "[]")
        val goalsArray = JSONArray(goalsJson)
        val activeGoalsList = mutableListOf<JSONObject>()
        for (i in 0 until goalsArray.length()) {
            val g = goalsArray.getJSONObject(i)
            // 완료되지 않은 목표만 필터링
            if (!g.optBoolean("is_completed", false)) {
                activeGoalsList.add(g)
            }
        }
        // order 순으로 정렬
        activeGoalsList.sortBy { it.optInt("order", 0) }

        val goalsContext = if (activeGoalsList.isNotEmpty()) {
            activeGoalsList.mapIndexed { index, g ->
                "${index + 1}. 제목: ${g.optString("title")} / 설명: ${g.optString("description", "설명 없음")}"
            }.joinToString("\n")
        } else {
            "현재 설정된 목표가 없습니다."
        }

        // ── MODE_CONFIGS 데이터 매핑 ──
        val modeName: String
        val weights: List<String>
        val toneKeywords: String
        val goalFocus: String

        if (currentMode == "restore") {
            modeName = "휴식과 치유 🌙"
            weights = listOf(
                "- western_astrology: high_priority (내면 날씨 - 달위상/행성각도)",
                "- saju_myeongri: medium_priority (에너지 잔량 - 일간 강약)",
                "- jamidusu: low_priority (관계성 - 복덕궁/노복궁)",
                "- name_analysis: bonus (치유음 - 편안한 소리)"
            )
            toneKeywords = "편안함, 공감, 회복, 통찰, 자기이해"
            goalFocus = "심리 케어, 우울 완화, 스트레스 해소, 관계 회복"
        } else {
            modeName = "성과와 성취 🔥"
            weights = listOf(
                "- saju_myeongri: high_priority (전장 파악 - 일진으로 방향 결정)",
                "- jamidusu: medium_priority (전략 무기 - 명궁/관록궁 주성)",
                "- western_astrology: low_priority (위험 회피 - 수성역행/Void of Course만)",
                "- name_analysis: bonus (부적 - 초성/색상)"
            )
            toneKeywords = "효율, 결과, 리더십, 집중, 실행, 타이밍"
            goalFocus = "비즈니스, 시험, 자기계발, 재물, 승진"
        }

        // ── destiny summary_for_ai 읽기 ──────────────────────
        val destinySummaryRaw = prefs.getString("CAP_local-app_setting_destiny_summary", null)
        val destinySummary = destinySummaryRaw?.removeSurrounding("\"")
            ?.replace("\\n", "\n")
            ?.replace("\\\"", "\"")
            ?: ""

        // ── 날짜·시간대 ──────────────────────────────────────
        val hour = Calendar.getInstance(TimeZone.getTimeZone("Asia/Seoul"))
            .get(Calendar.HOUR_OF_DAY)
        val timeSlot = when {
            hour < 6  -> "밤"
            hour < 12 -> "오전"
            hour < 18 -> "오후"
            hour < 22 -> "저녁"
            else      -> "밤"
        }

        // ── HADA 공통 시스템 프롬프트 (base44Client.js와 동일) ──
        val systemPrompt = """
            [HADA 앱 공통 규칙 — 모든 응답에 반드시 적용]
            0. [시스템 데이터] 블록의 전문 용어(신약·억부법·자미두수 등)는 분석 근거로만 참조하고 출력 문장에 절대 노출하지 마라.
            1. 부정·공포 표현 절대 금지: "나쁨" "흉" "위험" "조심" "망함" "실패" → "조율이 필요한 에너지" "내실을 다지기 좋은 시기" 등으로 치환.
            2. 전문 용어 절대 금지: 상관·편인·관살·충·형·파·해 → 쉬운 현대어로만 작성.
            3. 말투: 2인칭 대화체. (~하세요, ~해보세요, ~예요). "당신은 ~한 분이에요" 형식으로 직접 말 걸기.
            4. 필드별 최대 글자수: today_hint 16자 이내 / card_title 20자 이내. 초과 시 요약.
            5. 비교·경쟁 유발 금지.
            6. 모든 약점·부족한 부분은 반드시 "구체적 행동 조언"으로 전환.
        """.trimIndent()

        // ── 사용자 요청 프롬프트 (base44Client.js의 InvokeLLM 주입 방식과 동일) ──
        val userPrompt = """
            [시스템 데이터: 아래 계산 결과를 바탕으로 분석하세요]
            $destinySummary

            [사용자 요청]
            너는 HADA 앱의 일일 리딩 엔진이다.
            사용자의 목표 리스트를 분석하여 오늘 하루의 방향성을 제시하라.
            
            === $modeName (${currentMode} MODE) ===
            분석 위계:
            ${weights.joinToString("\n")}

            톤앤매너 키워드: $toneKeywords
            목표 영역: $goalFocus
            오늘 날짜: $today, 시간대: $timeSlot
            모드: $currentMode 

            [사용자의 현재 목표 리스트]
            $goalsContext

              [작성 규칙 — 글자 수는 방향 지시, 초과 시 코드 truncate]
              1. today_hint: 헤더 인사말. 사용자의 목표들 중 오늘 가장 집중하면 좋을 키워드를 녹여낼 것.
                16자 이내(text-xl 기준 iPhone SE 1줄). 줄바꿈 금지.
              2. welcome_subtitle: 전체 목표의 맥락과 연결된 동기부여 문구.
                20자 이내(text-base 기준). 줄바꿈 금지.
              3. base_stats: 위 목표들을 달성하기 위한 오늘 사용자의 기운/능력치 (0~100 정수).
              4. mode_card.suggested_mode : action 또는 restore 하나 선택.
              5. mode_card.card_body: 사용자의 목표 리스트 중 하나를 언급하며 구체적인 조언을 제공할 것

            [출력 규칙]
            - 반드시 JSON만 반환한다
            - 설명, 문장, 마크다운, 코드블록 절대 금지
            - 모든 필드는 반드시 채운다
            - 누락 금지
        """.trimIndent()

        val fullPrompt = "$systemPrompt\n\n$userPrompt"

        // ── JSON 스키마 ───────────────────────────────────────
        val schema = JSONObject().apply {
            put("type", "object")
            put("properties", JSONObject().apply {
                put("today_hint", JSONObject().apply { put("type", "string") })
                put("welcome_subtitle", JSONObject().apply { put("type", "string") })

                // base_stats 객체 추가
                put("base_stats", JSONObject().apply {
                    put("type", "object")
                    put("properties", JSONObject().apply {
                        put("work_efficiency", JSONObject().apply { put("type", "number") })
                        put("creativity", JSONObject().apply { put("type", "number") })
                        put("communication", JSONObject().apply { put("type", "number") })
                        put("focus", JSONObject().apply { put("type", "number") })
                        put("fortune", JSONObject().apply { put("type", "number") })
                    })
                })

                // mode_card 객체 확장
                put("mode_card", JSONObject().apply {
                    put("type", "object")
                    put("properties", JSONObject().apply {
                        put("suggested_mode", JSONObject().apply { put("type", "string") })
                        put("card_title", JSONObject().apply { put("type", "string") })
                        put("card_body", JSONObject().apply { put("type", "string") })
                    })
                })
            })
        }

        // ── Gemini API 호출 설정 수정 ──
        val requestBody = JSONObject().apply {
            put("contents", JSONArray().apply {
                put(JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply { put("text", fullPrompt) })
                    })
                })
            })
            put("generationConfig", JSONObject().apply {
                put("response_mime_type", "application/json")
                put("responseSchema", schema)
                put("temperature", 0.6)
                put("maxOutputTokens", 8192) // 스키마가 커졌으므로 토큰 제한 상향
            })
        }

        val client = OkHttpClient.Builder()
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        val request = Request.Builder()
            .url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey")
            .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
            .build()

        val responseStr = withContext(Dispatchers.IO) {
            client.newCall(request).execute().use { it.body?.string() ?: "" }
        }

        val responseJson = JSONObject(responseStr)
        val text = responseJson
            .getJSONArray("candidates")
            .getJSONObject(0)
            .getJSONObject("content")
            .getJSONArray("parts")
            .getJSONObject(0)
            .getString("text")

        val result = JSONObject(text)
        val todayHint = result.optString("today_hint", "오늘의 에너지를 확인하세요 ✨")
        val cardTitle = result.optJSONObject("mode_card")
            ?.optString("card_title", "HADA가 오늘의 리딩을 준비했어요")
            ?: "HADA가 오늘의 리딩을 준비했어요"

        // ── DailyReading SharedPreferences 저장 ──────────────
        saveDailyReading(prefs, today, result)

        return Pair(todayHint, cardTitle)
    }

    private fun saveDailyReading(
        prefs: android.content.SharedPreferences,
        today: String,
        result: JSONObject
    ) {
        val existingJson = prefs.getString("CAP_local-app_entity_DailyReading", "[]")
        val existingArray = JSONArray(existingJson)

        val newArray = JSONArray()
        for (i in 0 until existingArray.length()) {
            val item = existingArray.getJSONObject(i)
            if (item.optString("date") != today) newArray.put(item)
        }

        val newReading = JSONObject().apply {
            put("id", UUID.randomUUID().toString())
            put("date", today)
            put("today_hint", result.optString("today_hint", ""))
            put("welcome_subtitle", result.optString("welcome_subtitle", ""))
            put("base_stats", result.optJSONObject("base_stats") ?: JSONObject())
            put("mode_card", result.optJSONObject("mode_card") ?: JSONObject())
            put("recommended_mode", result.optJSONObject("mode_card")?.optString("suggested_mode", ""))
            put("created_at", System.currentTimeMillis())
        }
        newArray.put(newReading)

        prefs.edit()
            .putString("CAP_local-app_entity_DailyReading", newArray.toString())
            .apply()
    }

    private fun sendNotification(context: Context, title: String, body: String) {
        val channelId = "daily_reading"
        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "오늘의 리딩",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "HADA 일일 리딩 알림" }
            notificationManager.createNotificationChannel(channel)
        }

        val launchIntent = context.packageManager
            .getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)   // today_hint
            .setContentText(body)     // mode_card.card_title
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(1001, notification)
    }

    private fun getKSTDateString(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        sdf.timeZone = TimeZone.getTimeZone("Asia/Seoul")
        return sdf.format(Date())
    }
}