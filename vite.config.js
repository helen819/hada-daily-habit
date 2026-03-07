import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path"; // 경로 설정을 위해 추가 (필요 시)

// https://vite.dev/config/
export default defineConfig({
  // logLevel은 그대로 유지하거나 제거하셔도 됩니다.
  logLevel: "error",

  plugins: [react()],

  resolve: {
    alias: {
      // 기존에 @/internals 등으로 쓰이던 경로가 있다면 여기서 처리할 수 있습니다.
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    outDir: "dist",
    // Capacitor는 SPA(Single Page App) 구조에서
    // 모든 자산이 상대 경로로 참조되는 것이 안전할 때가 많습니다.
    assetsDir: "assets",
  },
});
