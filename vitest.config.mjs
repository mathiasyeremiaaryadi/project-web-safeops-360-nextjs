import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export const TEST_GO_ORIGIN = 'http://go.test';
export const TEST_APP_ORIGIN = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Next.js resolves `server-only`; under Vitest it is an empty module.
      'server-only': fileURLToPath(new URL('./tests/unit/server-only-stub.js', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: `${TEST_APP_ORIGIN}/` },
    },
    env: {
      API_ORIGIN: TEST_GO_ORIGIN,
      SESSION_SECRET: 'vitest-session-secret-0123456789abcdefghijklmnop',
    },
    setupFiles: ['./tests/unit/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'tests/unit/**/*.test.{js,jsx}'],
    restoreMocks: true,
    css: false,
  },
});
