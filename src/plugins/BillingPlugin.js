import { registerPlugin } from "@capacitor/core";

export const BillingPlugin = registerPlugin("Billing", {
    web: {
        // 웹 환경에서는 미구독으로 처리
        purchaseSubscription: async() => ({ launched: false }),
        getSubscriptionInfo: async() => ({
            isSubscribed: false,
            planId: "",
            expiryTimeMillis: 0,
        }),
    },
});