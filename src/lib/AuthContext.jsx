import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 로컬 앱이므로 항상 인증된 것으로 간주하고 로딩은 바로 종료합니다.
  const [user, setUser] = useState({ id: 'local-user', name: '사용자' });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  const logout = () => {
    console.log("로컬 앱에서는 로그아웃이 지원되지 않습니다.");
  };

  const navigateToLogin = () => {
    console.log("로컬 앱에서는 로그인이 필요하지 않습니다.");
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      logout,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};