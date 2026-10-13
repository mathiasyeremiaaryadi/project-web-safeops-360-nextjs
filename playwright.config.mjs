import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E tests run against a production build. The backend is mocked per test with
 * `page.route` (see tests/e2e/support/mock-api.js), so no Go API is needed.
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
    // Service workers would bypass page.route; the SW is tested separately.
    serviceWorkers: 'block',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { NEXT_PUBLIC_API_MOCKING: 'disabled' },
  },
});
