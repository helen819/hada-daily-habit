import React, { useEffect, useRef } from "react"; // useRef 추가
import { App as CapApp } from "@capacitor/app";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { pagesConfig } from "./pages.config";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider } from "@/lib/AuthContext";

const { Pages, Layout, mainPage } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) => {
  if (Layout) {
    return <Layout currentPageName={currentPageName}>{children}</Layout>;
  }
  // 🔥 빈 태그(<>) 대신 div로 감싸거나 null 처리를 명확히 합니다.
  return <div className="app-content">{children}</div>;
};

const MainAppContent = () => {
  const mainPageKey = mainPage ?? Object.keys(Pages)[0];
  const MainPage = Pages[mainPageKey];

  // 🔥 클릭 횟수와 시간을 제어하기 위한 Ref
  const lastTimeBackPress = useRef(0);
  const pressCount = useRef(0); // 클릭 횟수 추적
  const timePeriod = 2000; // 2초 이내 기준

  useEffect(() => {
    const backHandler = CapApp.addListener("backButton", () => {
      const currentTime = new Date().getTime();

      // 2초 이내에 다시 누른 경우 횟수 증가, 아니면 1로 초기화
      if (currentTime - lastTimeBackPress.current < timePeriod) {
        pressCount.current += 1;
      } else {
        pressCount.current = 1;
      }

      lastTimeBackPress.current = currentTime;

      // 횟수에 따른 동작 제어
      if (pressCount.current === 2) {
        // 두 번째 클릭 시 안내
        alert("'뒤로' 버튼을 한 번 더 누르면 종료됩니다.");
      } else if (pressCount.current >= 3) {
        // 세 번째 클릭 시 종료
        CapApp.exitApp();
      }
    });

    return () => {
      backHandler.then((h) => h.remove());
    };
  }, []);

  return (
    <Routes>
      {/* 루트 경로 */}
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            {MainPage ? <MainPage /> : <PageNotFound />}
          </LayoutWrapper>
        }
      />

      {/* 동적 페이지 경로 */}
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}

      {/* 404 페이지 */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <MainAppContent />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
