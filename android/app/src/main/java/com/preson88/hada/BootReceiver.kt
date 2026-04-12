package com.preson88.hada

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // 재부팅 시 가드 초기화 후 재예약
            val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            prefs.edit()
                .remove("alarm_last_scheduled_date") // 가드 리셋
                .apply()

            DailyAlarmPlugin.scheduleWeeklyAlarms(context)
        }
    }
}