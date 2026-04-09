package com.preson88.hada

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.text.SimpleDateFormat
import java.util.*

@CapacitorPlugin(name = "DailyAlarm")
class DailyAlarmPlugin : Plugin() {

    @PluginMethod
    fun checkAndRequestExactAlarmPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            if (!alarmManager.canScheduleExactAlarms()) {
                call.resolve(JSObject().apply { put("granted", false) })
                return
            }
        }
        call.resolve(JSObject().apply { put("granted", true) })
    }

    @PluginMethod
    fun scheduleAlarm(call: PluginCall) {
        val context = context
        val prefs = context.getSharedPreferences("CAPPrefs", Context.MODE_PRIVATE)

        // API 키 저장
        val apiKey = call.getString("apiKey") ?: run {
            call.reject("apiKey 없음")
            return
        }
        prefs.edit()
            .putString("CAP_local-app_setting_gemini_api_key", "\"$apiKey\"")
            .apply()

        // ── 중복 방지 가드 ──────────────────────────────────────
        val today = getKSTDateString()
        val lastScheduledDate = prefs.getString("alarm_last_scheduled_date", null)

        if (lastScheduledDate == today) {
            call.resolve(JSObject().apply { put("skipped", true) })
            return
        }

        // 30일치 예약 실행
        scheduleWeeklyAlarms(context)

        // 예약한 날짜 기록
        prefs.edit()
            .putString("alarm_last_scheduled_date", today)
            .apply()

        call.resolve(JSObject().apply { put("skipped", false) })
    }

    companion object {
        // ── Request code 설계 ───────────────────────────────────
        // 오전  8시 알람: 1001 ~ 1030  (일일 리딩 — 기존 유지)
        // 오전 11시 알람: 2001 ~ 2030  (오전 할일 리마인더)
        // 오후  3시 알람: 3001 ~ 3030  (오후 할일 리마인더)
        // 오후  7시 알람: 4001 ~ 4030  (저녁 할일 리마인더)
        private const val BASE_RC_08 = 1001
        private const val BASE_RC_11 = 2001
        private const val BASE_RC_15 = 3001
        private const val BASE_RC_19 = 4001
        private const val ALARM_DAYS = 30

        // 알람 타입 상수 — AlarmReceiver에서 Intent extra로 전달
        const val ALARM_TYPE_MORNING_READING = "morning_reading"  // 08시: Gemini 일일 리딩
        const val ALARM_TYPE_MORNING_TODO = "morning_todo"        // 11시: 오전 할일 리마인더
        const val ALARM_TYPE_AFTERNOON_TODO = "afternoon_todo"    // 15시: 오후 할일 리마인더
        const val ALARM_TYPE_EVENING_TODO = "evening_todo"        // 19시: 저녁 할일 리마인더

        fun scheduleWeeklyAlarms(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            for (dayOffset in 1..ALARM_DAYS) {
                // 08시 — 일일 리딩 알림 (기존과 동일)
                scheduleOneAlarm(
                    context, alarmManager,
                    dayOffset, hour = 8,
                    requestCode = BASE_RC_08 + dayOffset - 1,
                    alarmType = ALARM_TYPE_MORNING_READING
                )
                // 11시 — 오전 행운카드 할일 리마인더
                scheduleOneAlarm(
                    context, alarmManager,
                    dayOffset, hour = 11,
                    requestCode = BASE_RC_11 + dayOffset - 1,
                    alarmType = ALARM_TYPE_MORNING_TODO
                )
                // 15시 — 오후 행운카드 할일 리마인더
                scheduleOneAlarm(
                    context, alarmManager,
                    dayOffset, hour = 15,
                    requestCode = BASE_RC_15 + dayOffset - 1,
                    alarmType = ALARM_TYPE_AFTERNOON_TODO
                )
                // 19시 — 저녁 행운카드 할일 리마인더
                scheduleOneAlarm(
                    context, alarmManager,
                    dayOffset, hour = 19,
                    requestCode = BASE_RC_19 + dayOffset - 1,
                    alarmType = ALARM_TYPE_EVENING_TODO
                )
            }
        }

        private fun scheduleOneAlarm(
            context: Context,
            alarmManager: AlarmManager,
            dayOffset: Int,
            hour: Int,
            requestCode: Int,
            alarmType: String
        ) {
            val calendar = Calendar.getInstance(TimeZone.getTimeZone("Asia/Seoul")).apply {
                add(Calendar.DAY_OF_YEAR, dayOffset)
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("day_offset", dayOffset)
                putExtra("alarm_type", alarmType)
                putExtra("request_code", requestCode)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            }
        }

        // AlarmReceiver에서 발화 후 30일 뒤 같은 슬롯으로 재예약
        fun rescheduleOneAlarm(context: Context, requestCode: Int, alarmType: String) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            // requestCode에서 hour 역산
            val hour = when {
                requestCode >= BASE_RC_19 -> 19
                requestCode >= BASE_RC_15 -> 15
                requestCode >= BASE_RC_11 -> 11
                else -> 8  // BASE_RC_08
            }

            val calendar = Calendar.getInstance(TimeZone.getTimeZone("Asia/Seoul")).apply {
                add(Calendar.DAY_OF_YEAR, 30)
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("alarm_type", alarmType)
                putExtra("request_code", requestCode)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            }
        }

        fun getKSTDateString(): String {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            sdf.timeZone = TimeZone.getTimeZone("Asia/Seoul")
            return sdf.format(Date())
        }
    }
}
