package com.prelen.hadadailyhabit

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.prelen.hadadailyhabit.R
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        val alarmType = intent.getStringExtra("alarm_type") ?: ""
        val requestCode = intent.getIntExtra("request_code", -1)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                when (alarmType) {

                    // ── 오전 8시: 고정 메시지 알림 ──────────────────────────
                    DailyAlarmPlugin.ALARM_TYPE_MORNING_READING -> {
                        sendNotification(
                            context,
                            title          = "오늘의 에너지를 확인하세요 ✨",
                            body           = "HADA가 오늘의 리딩을 준비했어요",
                            notificationId = 1001
                        )
                    }

                    // ── 오전 11시: recommended_time 11~14시 행운카드 할일 알림 ──
                    DailyAlarmPlugin.ALARM_TYPE_MORNING_TODO -> {
                        handleCardTodoAlarm(
                            context      = context,
                            fromHour     = 11,
                            toHour       = 15,
                            fallbackTitle = "오늘 목표, 지금 시작해요 ✨",
                            notificationId = 1101
                        )
                    }

                    // ── 오후 3시: recommended_time 15~18시 행운카드 할일 알림 ──
                    DailyAlarmPlugin.ALARM_TYPE_AFTERNOON_TODO -> {
                        handleCardTodoAlarm(
                            context      = context,
                            fromHour     = 15,
                            toHour       = 19,
                            fallbackTitle = "오후의 기운을 활용해 보세요 🌟",
                            notificationId = 1501
                        )
                    }

                    // ── 오후 7시: recommended_time 19~21시 행운카드 할일 알림 ──
                    DailyAlarmPlugin.ALARM_TYPE_EVENING_TODO -> {
                        handleCardTodoAlarm(
                            context      = context,
                            fromHour     = 19,
                            toHour       = 23,
                            fallbackTitle = "하루 마무리 실천 시간 🌙",
                            notificationId = 1901
                        )
                    }

                    else -> { /* no-op */ }
                }
            } catch (e: Exception) {
                // no-op — 11/15/19시 알람 오류는 조용히 실패
            } finally {
                // 발화된 슬롯을 30일 뒤로 재예약
                if (requestCode >= 0) {
                    DailyAlarmPlugin.rescheduleOneAlarm(context, requestCode, alarmType)
                }
                pendingResult.finish()
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 11시 / 15시 / 19시 — recommended_time(HH) 기반 행운카드 할일 알림
    //
    // fromHour 이상 toHour 미만의 HH를 가진 미완료 카드 할일을 검색.
    // 없으면 첫 번째 목표 이름을 포함한 독려 메시지를 발송.
    // ═══════════════════════════════════════════════════════════════

    private fun handleCardTodoAlarm(
        context: Context,
        fromHour: Int,
        toHour: Int,
        fallbackTitle: String,
        notificationId: Int
    ) {
        val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        val today = getKSTDateString()

        val todosJson  = prefs.getString("local-app_entity_GoalTodo", "[]")
        val todosArray = try { JSONArray(todosJson) } catch (e: Exception) { JSONArray() }

        // 오늘 날짜 + 카드에서 추가됨 + 미완료 + HH 범위 [fromHour, toHour) 필터
        val matched = mutableListOf<JSONObject>()
        for (i in 0 until todosArray.length()) {
            val todo = todosArray.getJSONObject(i)
            if (todo.optString("date") != today) continue
            if (!todo.optBoolean("is_from_card", false)) continue
            if (todo.optBoolean("completed", false)) continue

            val h = todo.optString("recommended_time", "").toIntOrNull() ?: continue
            if (h >= fromHour && h < toHour) matched.add(todo)
        }

        if (matched.isNotEmpty()) {
            val first   = matched[0]
            val title   = first.optString("title", "")

            val baseBody  = title
            val finalBody = if (matched.size > 1) "$baseBody 외 ${matched.size - 1}개" else baseBody

            sendNotification(context, fallbackTitle, finalBody, notificationId)  // ← fallbackTitle 고정
        } else {
            // 매칭 없을 때: 첫 번째 목표 이름을 포함한 독려 메시지
            val firstGoal = getFirstGoalTitle(prefs)
            val body = if (firstGoal.isNotEmpty()) {
                "'$firstGoal' 목표를 위한 행운 실천 카드를 확인해 보세요!"
            } else {
                "오늘 목표를 위한 행운 실천 카드를 확인하고 할일을 추가해 보세요!"
            }
            sendNotification(context, fallbackTitle, body, notificationId)
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 공통 유틸
    // ═══════════════════════════════════════════════════════════════

    private fun getFirstGoalTitle(prefs: android.content.SharedPreferences): String {
        val goalsJson  = prefs.getString("local-app_entity_Goal", "[]")
        val goalsArray = try { JSONArray(goalsJson) } catch (e: Exception) { return "" }

        val active = mutableListOf<JSONObject>()
        for (i in 0 until goalsArray.length()) {
            val g = goalsArray.getJSONObject(i)
            if (!g.optBoolean("is_completed", false)) active.add(g)
        }
        active.sortBy { it.optInt("order", Int.MAX_VALUE) }
        return active.firstOrNull()?.optString("title", "") ?: ""
    }

    private fun sendNotification(
        context: Context,
        title: String,
        body: String,
        notificationId: Int
    ) {
        val channelId = "hada_reminders"
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(channelId, "HADA 알림", NotificationManager.IMPORTANCE_DEFAULT)
                    .apply { description = "HADA 일일 리딩 및 행운 실천 카드 알림" }
            )
        }

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pi = PendingIntent.getActivity(
            context, notificationId, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        nm.notify(
            notificationId,
            NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build()
        )
    }

    private fun getKSTDateString(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        sdf.timeZone = TimeZone.getTimeZone("Asia/Seoul")
        return sdf.format(Date())
    }
}