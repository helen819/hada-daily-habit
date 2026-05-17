package com.prelen.hadadailyhabit

import com.android.billingclient.api.*
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "Billing")
class BillingPlugin : Plugin() {

    private val SUBSCRIPTION_ID = "no_ads"

    private lateinit var billingClient: BillingClient

    override fun load() {
        billingClient = BillingClient.newBuilder(context)
            .setListener { billingResult, purchases ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    purchases?.forEach { purchase ->
                        acknowledgePurchase(purchase)
                    }
                    // 구매 완료 시 JS 이벤트 발송
                    notifyListeners("purchaseCompleted", JSObject())
                }
            }
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .enablePrepaidPlans()
                    .build()
            )
            .build()
    }

    @PluginMethod
    fun getSubscriptionInfo(call: PluginCall) {
        connectAndRun { connected ->
            if (!connected) {
                call.resolve(
                    JSObject()
                        .put("isSubscribed", false)
                        .put("planId", "")
                        .put("expiryTimeMillis", 0L)
                )
                return@connectAndRun
            }

            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build()

            billingClient.queryPurchasesAsync(params) { _, purchases ->
                val activePurchase = purchases.firstOrNull { purchase ->
                    purchase.purchaseState == Purchase.PurchaseState.PURCHASED &&
                            purchase.products.contains(SUBSCRIPTION_ID)
                }

                val ret = JSObject()
                if (activePurchase != null) {
                    val planId = activePurchase.accountIdentifiers
                        ?.obfuscatedAccountId ?: ""

                    // basePlanId 기준으로 만료 시간 계산
                    // 라이선스 테스트: 1week=5분, 1month=5분, 1year=30분
                    // 실제 출시: 1week=7일, 1month=30일, 1year=365일
                    val durationMillis = when (planId) {
                        "1week"  -> 7L   * 24 * 60 * 60 * 1000
                        "1month" -> 30L  * 24 * 60 * 60 * 1000
                        "1year"  -> 365L * 24 * 60 * 60 * 1000
                        else     -> 0L
                    }

                    val expiryTimeMillis = if (durationMillis > 0L) {
                        activePurchase.purchaseTime + durationMillis
                    } else 0L

                    // Google Play가 이미 만료된 구독은 queryPurchasesAsync 결과에서
                    // 제외하므로, 여기까지 왔으면 실제 활성 구독임.
                    // expiryTimeMillis는 UI 표시용으로만 사용.
                    ret.put("isSubscribed", true)
                    ret.put("planId", planId)
                    ret.put("expiryTimeMillis", expiryTimeMillis)
                } else {
                    ret.put("isSubscribed", false)
                    ret.put("planId", "")
                    ret.put("expiryTimeMillis", 0L)
                }
                call.resolve(ret)
            }
        }
    }

    @PluginMethod
    fun purchaseSubscription(call: PluginCall) {
        val basePlanId = call.getString("basePlanId") ?: run {
            call.reject("basePlanId가 없습니다")
            return
        }

        connectAndRun { connected ->
            if (!connected) {
                call.reject("Play Store 연결 실패")
                return@connectAndRun
            }

            val productList = listOf(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(SUBSCRIPTION_ID)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            )

            billingClient.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder()
                    .setProductList(productList)
                    .build()
            ) { billingResult, detailsList ->

                if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                    call.reject("상품 조회 실패: ${billingResult.debugMessage}")
                    return@queryProductDetailsAsync
                }
                if (detailsList.isEmpty()) {
                    call.reject("상품을 찾을 수 없습니다")
                    return@queryProductDetailsAsync
                }

                val productDetails = detailsList[0]
                val subOfferDetails = productDetails.subscriptionOfferDetails

                if (subOfferDetails.isNullOrEmpty()) {
                    call.reject("구독 옵션을 찾을 수 없습니다")
                    return@queryProductDetailsAsync
                }

                val targetOffer = subOfferDetails.find { it.basePlanId == basePlanId }
                    ?: run {
                        call.reject("요금제를 찾을 수 없습니다: $basePlanId")
                        return@queryProductDetailsAsync
                    }

                val billingFlowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(
                        listOf(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(productDetails)
                                .setOfferToken(targetOffer.offerToken)
                                .build()
                        )
                    )
                    .setObfuscatedAccountId(basePlanId)
                    .build()

                activity.runOnUiThread {
                    val result = billingClient.launchBillingFlow(activity, billingFlowParams)
                    if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                        call.resolve(JSObject().put("launched", true))
                    } else {
                        call.reject("구매 창 실행 실패: ${result.debugMessage}")
                    }
                }
            }
        }
    }

    private fun acknowledgePurchase(purchase: Purchase) {
        if (purchase.isAcknowledged) return
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()
        billingClient.acknowledgePurchase(params) { }
    }

    private fun connectAndRun(block: (Boolean) -> Unit) {
        if (billingClient.isReady) {
            block(true)
            return
        }
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                block(result.responseCode == BillingClient.BillingResponseCode.OK)
            }
            override fun onBillingServiceDisconnected() {
                block(false)
            }
        })
    }
}