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
      <div className="max-w-md mx-auto relative">
        {!hideNav && (
          <div className="fixed top-0 right-0 z-30 p-4 flex items-center gap-2">
            {/* Mode Toggle */}
            <button
              onClick={toggleMode}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                currentMode === "action"
                  ? "bg-purple-100 hover:bg-purple-200"
                  : "bg-green-100 hover:bg-green-200"
              }`}
              aria-label="Toggle mode"
            >
              {currentMode === "action" ? (
                <Zap className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
              ) : (
                <Leaf className="w-5 h-5 text-green-600" strokeWidth={1.5} />
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

        {children}

        {!hideNav && (
          <nav className="fixed bottom-0 left-0 right-0 z-40">
            <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-gray-100">
              <div className="flex items-center justify-around py-2 px-4">
                {navItems.map(({ name, icon: Icon, label }) => {
                  const isActive = currentPageName === name;
                  return (
                    <Link
                      key={name}
                      to={createPageUrl(name)}
                      className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isActive ? "text-purple-500" : "text-gray-400"}`}
                        strokeWidth={1.5}
                      />
                      <span
                        className={`text-[9px] font-semibold ${isActive ? "text-purple-600" : "text-gray-400"}`}
                      >
                        {label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
