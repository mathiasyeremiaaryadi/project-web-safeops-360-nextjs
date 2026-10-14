import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E tests run on a production build (`next start`). Signed-in pages use an in-browser mock of
 * the API (tests/e2e/support/mock-api.js), so the tests never read or change data on the Go
 * backend. API_ORIGIN is still required for the BFF to start; it is only reached by the
 * unauthenticated checks (CSRF, forged cookie), which the BFF answers itself.
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
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      API_ORIGIN: process.env.API_ORIGIN ?? 'http://103.150.226.7:8082',
      SESSION_SECRET: 'e2e-session-secret-not-used-anywhere-else-0123456789',
    },
  },
});
