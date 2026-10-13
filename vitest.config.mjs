import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost:3000/' },
    },
    setupFiles: ['./tests/unit/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'tests/unit/**/*.test.{js,jsx}'],
    restoreMocks: true,
    css: false,
  },
});
