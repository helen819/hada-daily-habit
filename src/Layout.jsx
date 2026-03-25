import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Home,
  Heart,
  User,
  ShoppingBag,
  CalendarDays,
  Moon,
  Sun,
  Zap,
  Leaf,
} from "lucide-react";
// All icons use strokeWidth={1.5} for line-art consistency
import { base44 } from "@/api/base44Client";
import AdModal from "@/components/shop/AdModal";
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
} from "@capacitor-community/admob";
import { AD_UNITS } from "@/plugins/admob";

// const PAGES_WITH_BANNER = ["CalendarPage", "Happiness", "Profile"];
const PAGES_WITH_BANNER = ["Happiness"];

const navItems = [
  { name: "Home", icon: Home, label: "홈" },
  { name: "CalendarPage", icon: CalendarDays, label: "캘린더" },
  { name: "Happiness", icon: Heart, label: "기록" },
  { name: "Shop", icon: ShoppingBag, label: "상점" },
  { name: "Profile", icon: User, label: "프로필" },
];

export default function Layout({ children, currentPageName }) {
  const hideNav = currentPageName === "Onboarding";
  const [isDark, setIsDark] = useState(false);
  const [currentMode, setCurrentMode] = useState("action");
  const [showModeAd, setShowModeAd] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  // 1. [수정] 초기 테마 로드 (Preferences 사용)
  useEffect(() => {
    const loadTheme = async () => {
      const saved = await base44.storage.get("darkMode");
      const isDarkTheme = saved === "true" || saved === true;
      setIsDark(isDarkTheme);
      if (isDarkTheme) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    if (hideNav) return;
    base44.entities.UserProfile.list().then((profiles) => {
      if (profiles?.[0]?.current_mode) setCurrentMode(profiles[0].current_mode);
    });
  }, [hideNav]);

  // 🔥 [추가된 부분] 외부(Home 등)에서 발생한 모드 변경 이벤트 감지
  useEffect(() => {
    const handleModeChange = (e) => {
      if (e.detail) {
        setCurrentMode(e.detail);
      }
    };

    window.addEventListener("modeChanged", handleModeChange);
    return () => {
      window.removeEventListener("modeChanged", handleModeChange);
    };
  }, []);

  useEffect(() => {
    if (hideNav) return;

    const updateBanner = async () => {
      if (PAGES_WITH_BANNER.includes(currentPageName)) {
        await AdMob.hideBanner().catch(() => {});
        await AdMob.showBanner({
          adId: AD_UNITS.banner,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.TOP_CENTER,
          margin: 20,
        }).catch((e) => console.log("배너 로드 실패:", e));
      } else {
        await AdMob.hideBanner().catch(() => {});
      }
    };

    updateBanner();
  }, [currentPageName, hideNav]);

  // 2. [수정] 테마 토글 로직 (Preferences 사용)
  const toggleTheme = async () => {
    const newDark = !isDark;
    setIsDark(newDark);

    // Preferences에 저장
    await base44.storage.set("darkMode", String(newDark));

    if (newDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleMode = async () => {
    const profiles = await base44.entities.UserProfile.list();
    const profile = profiles?.[0];
    if (!profile) return;
    const newMode = profile.current_mode === "action" ? "restore" : "action";
    setPendingMode({ profile, newMode });
    setShowModeAd(true);
  };

  const applyModeChange = async () => {
    if (!pendingMode) return;
    const { profile, newMode } = pendingMode;
    await base44.entities.UserProfile.update(profile.id, {
      current_mode: newMode,
    });
    setCurrentMode(newMode);
    window.dispatchEvent(new CustomEvent("modeChanged", { detail: newMode }));
    setPendingMode(null);
    setShowModeAd(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdModal
        visible={showModeAd}
        onClose={applyModeChange}
        closeLabel="모드 전환하기 ✨"
      />
      {/* 
          1. 전체 컨테이너에 상단/하단 여백 확보 
          pt: 노치 높이만큼, pb: 하단바 높이만큼 (기본 패딩 포함)
      */}
      <div className="flex-1 w-full max-w-md mx-auto relative flex flex-col">
        {!hideNav && (
          <div
            className="fixed right-0 z-30 p-4 flex items-center gap-2"
            style={{ top: "env(safe-area-inset-top)" }} // 노치 아래로 버튼을 밀어줌
          >
            {/* Mode Toggle */}
            <button
              onClick={toggleMode}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                currentMode === "action"
                  ? "bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/50"
                  : "bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-800/50"
              }`}
              aria-label="Toggle mode"
            >
              {currentMode === "action" ? (
                <Zap
                  className="w-5 h-5 text-purple-600 dark:text-purple-400"
                  strokeWidth={1.5}
                />
              ) : (
                <Leaf
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  strokeWidth={1.5}
                />
              )}
            </button>
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
              )}
            </button>
          </div>
        )}

        {/* 2. 메인 콘텐츠: 상단 노치 여백과 하단 탭바 여백을 설정합니다 */}
        <main
          className="flex-1 w-full"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 20px)", // 노치 + 여유공간
            paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)", // 하단바 + 탭바 높이
          }}
        >
          {children}
        </main>

        {/* 3. 하단 네비게이션: 배경은 바닥까지, 아이콘만 안전영역 위로 */}
        {!hideNav && (
          <nav
            className="fixed left-0 right-0 z-40 p-4"
            style={{ bottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="max-w-md mx-auto bg-white/95 dark:bg-[#262B3D] backdrop-blur-xl border border-gray-100 dark:border-[#424B63] rounded-3xl shadow-2xl flex items-center justify-around py-3 px-2">
              {navItems.map(({ name, icon: Icon, label }) => {
                const isActive = currentPageName === name;
                return (
                  <Link
                    key={name}
                    to={createPageUrl(name)}
                    className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isActive
                          ? "text-purple-500 dark:text-purple-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                      strokeWidth={1.5}
                    />
                    <span
                      className={`text-[9px] font-semibold ${
                        isActive
                          ? "text-purple-600 dark:text-purple-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
