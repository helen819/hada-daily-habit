import {
    AdMob,
    BannerAdSize,
    BannerAdPosition,
    AdLoadInfo,
} from "@capacitor-community/admob";

// 테스트 광고 ID (실제 배포 시 교체)
export const AD_UNITS = {
    banner: "ca-app-pub-3940256099942544/6300978111",
    interstitial: "ca-app-pub-3940256099942544/1033173712",
};

let interstitialLoaded = false;
let isInitialized = false;

export async function initAdMob() {
    if (isInitialized) return;
    try {
        await AdMob.initialize({
            initializeForTesting: true, // 테스트 모드
        });
        isInitialized = true;
        // 초기화 직후 인터스티셜 미리 로드
        await preloadInterstitial();
    } catch (e) {
        console.log("AdMob 초기화 실패:", e);
    }
}

// 인터스티셜 미리 로드
export async function preloadInterstitial() {
    if (interstitialLoaded) return;
    try {
        await AdMob.prepareInterstitial({
            adId: AD_UNITS.interstitial,
        });
        console.log("인터스티셜 프리로드 성공");
        interstitialLoaded = true;
    } catch (e) {
        console.log("인터스티셜 프리로드 실패:", e);
        interstitialLoaded = false;
    }
}

// 인터스티셜 표시
export async function showInterstitial() {
    try {
        if (!interstitialLoaded) {
            // 로드 안 됐으면 즉시 로드 시도
            await AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial });
        }
        await AdMob.showInterstitial();
        interstitialLoaded = false;
        // 다음 광고 미리 로드
        preloadInterstitial();
        return true;
    } catch (e) {
        console.log("인터스티셜 표시 실패:", e);
        interstitialLoaded = false;
        return false;
    }
}

// 배너 표시
export async function showBanner(adUnitId) {
    try {
        await AdMob.showBanner({
            adId: adUnitId || AD_UNITS.banner,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
        });
    } catch (e) {
        console.log("배너 표시 실패:", e);
    }
}

export async function hideBanner() {
    try {
        await AdMob.hideBanner();
    } catch (e) {}
}