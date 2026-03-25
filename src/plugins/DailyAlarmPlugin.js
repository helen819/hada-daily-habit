import { registerPlugin } from "@capacitor/core";

export const DailyAlarmPlugin = registerPlugin("DailyAlarm", {
    web: {
        scheduleAlarm: async() => {},
        checkAndRequestExactAlarmPermission: async() => ({ granted: true }),
    },
});