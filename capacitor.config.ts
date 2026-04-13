import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prelen.hadadailyhabit',
  appName: 'hada-daily-habit',
  webDir: 'dist',
    plugins: {
    StatusBar: {
      // 안드로이드에서 웹뷰가 상태바(노치) 영역까지 덮도록 설정
      overlaysWebView: false,
      // 상태바 아이콘 색상 설정 (밝은 배경이면 'DARK', 어두운 배경이면 'LIGHT')
      style: 'DEFAULT', 
    },
    Keyboard: {
      resize: "body", // 키보드가 올라올 때 body 전체 크기를 조절함
      resizeOnFullScreen: true,
    },
  },
};

export default config;
