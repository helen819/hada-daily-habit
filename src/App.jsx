import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { pagesConfig } from "./pages.config";
// BrowserRouter 대신 HashRouter를 가져옵니다.
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
  // MainPage를 컴포넌트 자체로 할당 (jsx 엘리먼트가 아닌 컴포넌트 참조)
  const MainPage = Pages[mainPageKey];

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
        {/* HashRouter를 사용하여 안드로이드 환경의 경로 문제를 방지합니다. */}
        <Router>
          <MainAppContent />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
