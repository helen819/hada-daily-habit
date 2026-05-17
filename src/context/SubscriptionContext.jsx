import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app"; // npm i @capacitor/app 필요
import { BillingPlugin } from "@/plugins/BillingPlugin";

const CACHE_KEY = "subscription_cache_v2";

const SubscriptionContext = createContext({
  isSubscribed: false,
  currentPlanId: "",
  expiryDate: null,
  isLoading: true,
  checkSubscription: async () => {},
  purchaseSubscription: async () => {},
});

// ── 캐시 유틸 (서버 실패 시 폴백 전용) ────────────────────────
const saveCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
};

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState("");
  const [expiryDate, setExpiryDate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const purchaseListenerRef = useRef(null);
  const foregroundListenerRef = useRef(null);

  // ── 상태 적용 ──────────────────────────────────────────────
  const applyState = ({ isSubscribed, planId, expiryTimeMillis }) => {
    setIsSubscribed(isSubscribed);
    setCurrentPlanId(planId || "");
    setExpiryDate(
      isSubscribed && expiryTimeMillis > 0 ? new Date(expiryTimeMillis) : null,
    );
  };

  // ── 서버에서 직접 가져오기 ─────────────────────────────────
  const fetchFromServer = async () => {
    const result = await BillingPlugin.getSubscriptionInfo();
    const data = {
      isSubscribed: result.isSubscribed,
      planId: result.planId || "",
      expiryTimeMillis: result.expiryTimeMillis ?? 0,
    };
    saveCache(data); // 성공하면 캐시 갱신
    applyState(data);
    return data;
  };

  // ── 공개 API: 구독 상태 확인 ───────────────────────────────
  // 항상 서버 먼저, 실패 시 캐시 폴백
  const checkSubscription = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsLoading(false);
      return;
    }

    try {
      await fetchFromServer();
    } catch (e) {
      console.warn("구독 서버 확인 실패, 캐시 폴백:", e);
      const cache = loadCache();
      if (cache) {
        applyState(cache);
      } else {
        applyState({ isSubscribed: false, planId: "", expiryTimeMillis: 0 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── 공개 API: 구독 구매 ────────────────────────────────────
  const purchaseSubscription = async (basePlanId) => {
    if (!Capacitor.isNativePlatform()) return;
    await BillingPlugin.purchaseSubscription({ basePlanId });
    // 완료는 purchaseCompleted 이벤트가 처리
  };

  // ── 결제 완료 이벤트 → 즉시 UI 갱신 ──────────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setup = async () => {
      try {
        purchaseListenerRef.current = await BillingPlugin.addListener(
          "purchaseCompleted",
          async () => {
            console.log("purchaseCompleted 수신 → 즉시 재확인");
            try {
              await fetchFromServer();
            } catch (e) {
              console.error("구매 후 서버 확인 실패:", e);
            }
          },
        );
      } catch (e) {
        console.error("purchaseCompleted 리스너 등록 실패:", e);
      }

      // 포그라운드 진입마다 서버 재확인
      try {
        foregroundListenerRef.current = await App.addListener(
          "appStateChange",
          ({ isActive }) => {
            if (isActive) {
              console.log("포그라운드 진입 → 구독 상태 재확인");
              checkSubscription();
            }
          },
        );
      } catch (e) {
        console.error("appStateChange 리스너 등록 실패:", e);
      }
    };

    setup();

    return () => {
      purchaseListenerRef.current?.remove();
      foregroundListenerRef.current?.remove();
    };
  }, []);

  // ── 앱 최초 시작 ───────────────────────────────────────────
  useEffect(() => {
    checkSubscription();
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        currentPlanId,
        expiryDate,
        isLoading,
        checkSubscription,
        purchaseSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
