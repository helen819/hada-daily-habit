import React, { useEffect, useRef } from "react"; // useRef 추가
import { App as CapApp } from "@capacitor/app";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { pagesConfig } from "./pages.config";
import {
  HashRouter as Router,
  Route,
  Routes,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();
  const mainPageKey = mainPage ?? Object.keys(Pages)[0];
  // MainPage를 컴포넌트 자체로 할당 (jsx 엘리먼트가 아닌 컴포넌트 참조)
  const MainPage = Pages[mainPageKey];
  // 🔥 뒤로가기 로직을 Router 내부인 이곳으로 이동
  const lastTimeBackPress = useRef(0);
  const timePeriodToExit = 2000; // 2초

  useEffect(() => {
    const backHandler = CapApp.addListener("backButton", () => {
      if (
        location.pathname === "/" ||
        location.pathname === `/${mainPageKey}`
      ) {
        const currentTime = new Date().getTime();
        if (currentTime - lastTimeBackPress.current < timePeriodToExit) {
          CapApp.exitApp();
        } else {
          // 토스트 메시지나 알림을 띄우면 좋습니다 (Capacitor Toast 플러그인 필요)
          alert("'뒤로' 버튼을 한 번 더 누르면 종료됩니다.");
          lastTimeBackPress.current = currentTime;
        }
      } else {
        navigate(-1);
      }
    });
    return () => {
      backHandler.then((h) => h.remove());
    };
  }, [location, navigate, mainPageKey]);

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
