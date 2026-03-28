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
        // 오늘 날짜 기준으로 이미 7일치 예약했는지 확인
        val today = getKSTDateString()
        val lastScheduledDate = prefs.getString("alarm_last_scheduled_date", null)

        if (lastScheduledDate == today) {
            // 오늘 이미 예약했으면 스킵
            call.resolve(JSObject().apply { put("skipped", true) })
            return
        }

        // 7일치 예약 실행
        scheduleWeeklyAlarms(context)

        // 예약한 날짜 기록
        prefs.edit()
            .putString("alarm_last_scheduled_date", today)
            .apply()

        call.resolve(JSObject().apply { put("skipped", false) })
    }

    companion object {
        // AlarmManager request code 기준: 1001 ~ 1030 (30일치)
        private const val BASE_REQUEST_CODE = 1001
        private const val ALARM_DAYS = 30

        fun scheduleWeeklyAlarms(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            for (dayOffset in 1..ALARM_DAYS) {
                val calendar = Calendar.getInstance(TimeZone.getTimeZone("Asia/Seoul")).apply {
                    add(Calendar.DAY_OF_YEAR, dayOffset)
                    set(Calendar.HOUR_OF_DAY, 8)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }

                val intent = Intent(context, AlarmReceiver::class.java).apply {
                    // 각 날짜 식별용 extra (AlarmReceiver에서 로깅 등에 활용 가능)
                    putExtra("day_offset", dayOffset)
                }

                // dayOffset마다 다른 requestCode → PendingIntent가 겹치지 않음
                val requestCode = BASE_REQUEST_CODE + dayOffset - 1
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
        }

        // AlarmReceiver에서 실행 후 다음 주 같은 요일 재예약할 때 사용
        fun rescheduleOneDayAfterWeek(context: Context, dayOffset: Int) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            // 7일 뒤 같은 시간으로 밀어서 재예약
            val calendar = Calendar.getInstance(TimeZone.getTimeZone("Asia/Seoul")).apply {
                add(Calendar.DAY_OF_YEAR, 7)
                set(Calendar.HOUR_OF_DAY, 7)
                set(Calendar.MINUTE, 50)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("day_offset", dayOffset)
            }

            val requestCode = BASE_REQUEST_CODE + dayOffset - 1
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