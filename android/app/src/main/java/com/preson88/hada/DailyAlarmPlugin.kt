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
        val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)

        val apiKey = call.getString("apiKey") ?: run {
            call.reject("apiKey 없음")
            return
        }
        prefs.edit()
            .putString("local-app_setting_gemini_api_key", "\"$apiKey\"")
            .apply()

        val today = getKSTDateString()
        val lastScheduledDate = prefs.getString("alarm_last_scheduled_date", null)

        if (lastScheduledDate == today) {
            call.resolve(JSObject().apply { put("skipped", true) })
            return
        }

        scheduleWeeklyAlarms(context)

        prefs.edit()
            .putString("alarm_last_scheduled_date", today)
            .apply()

        call.resolve(JSObject().apply { put("skipped", false) })
    }

    companion object {
        // dayOffset 0~30 (31일치) 이므로 base + 30까지 사용
        // 각 타입 간 간격을 100으로 여유있게 설정
        private const val BASE_RC_08 = 1000   // 1000~1030
        private const val BASE_RC_11 = 2000   // 2000~2030
        private const val BASE_RC_15 = 3000   // 3000~3030
        private const val BASE_RC_19 = 4000   // 4000~4030
        private const val ALARM_DAYS = 30

        const val ALARM_TYPE_MORNING_READING = "morning_reading"
        const val ALARM_TYPE_MORNING_TODO    = "morning_todo"
        const val ALARM_TYPE_AFTERNOON_TODO  = "afternoon_todo"
        const val ALARM_TYPE_EVENING_TODO    = "evening_todo"

        fun scheduleWeeklyAlarms(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) return
            }

            val nowHour = Calendar.getInstance(TimeZone.getTimeZone("Asia/Seoul"))
                .get(Calendar.HOUR_OF_DAY)

            val slots = listOf(
                Triple(8,  BASE_RC_08, ALARM_TYPE_MORNING_READING),
                Triple(11, BASE_RC_11, ALARM_TYPE_MORNING_TODO),
                Triple(15, BASE_RC_15, ALARM_TYPE_AFTERNOON_TODO),
                Triple(19, BASE_RC_19, ALARM_TYPE_EVENING_TODO),
            )

            for (dayOffset in 0..ALARM_DAYS) {
                for ((hour, baseRc, alarmType) in slots) {
                    // 오늘(dayOffset == 0)이고 이미 지난 시간이면 스킵
                    if (dayOffset == 0 && nowHour >= hour) continue

                    scheduleOneAlarm(
                        context      = context,
                        alarmManager = alarmManager,
                        dayOffset    = dayOffset,
                        hour         = hour,
                        requestCode  = baseRc + dayOffset,
                        alarmType    = alarmType
                    )
                }
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

        fun rescheduleOneAlarm(context: Context, requestCode: Int, alarmType: String) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val hour = when {
                requestCode >= BASE_RC_19 -> 19
                requestCode >= BASE_RC_15 -> 15
                requestCode >= BASE_RC_11 -> 11
                else -> 8
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