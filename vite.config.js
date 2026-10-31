/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 브라우저 테스트가 처음 실행될 때 의존성을 뒤늦게 묶으며 페이지를 새로고침하지 않게 해요.
  optimizeDeps: { include: ['react-dom/client', 'react-router', 'zustand'] },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.{js,jsx}'],
    // createImageBitmap·canvas.toBlob은 jsdom에 없어서 실제 Chromium에서 돌립니다.
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
});
