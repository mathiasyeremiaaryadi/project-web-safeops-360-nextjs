import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const MOCK_GO_PORT = Number(process.env.E2E_MOCK_GO_PORT ?? 4110);
const baseURL = `http://localhost:${PORT}`;

export const MOCK_GO_ORIGIN = `http://127.0.0.1:${MOCK_GO_PORT}`;

/**
 * E2E tests run the full chain on a production build:
 *   browser → Next.js (`next start`, BFF) → mock Go backend (scripts/mock-go-server.mjs).
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: true,
  // A single `next start` renders every page per request (CSP nonce); keep load realistic.
  workers: process.env.CI ? 2 : 4,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'id-ID',
    trace: 'retain-on-failure',
    // The PWA service worker is not under test here; keep runs deterministic.
    serviceWorkers: 'block',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `node scripts/mock-go-server.mjs ${MOCK_GO_PORT}`,
      url: `${MOCK_GO_ORIGIN}/__mock/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `pnpm build && pnpm start --port ${PORT}`,
      url: `${baseURL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: {
        NEXT_PUBLIC_API_MOCKING: 'disabled',
        API_ORIGIN: MOCK_GO_ORIGIN,
        SESSION_SECRET: 'e2e-session-secret-not-used-anywhere-else-0123456789',
      },
    },
  ],
});
