import { expect } from '@playwright/test';
import { MOCK_GO_ORIGIN } from '../../../playwright.config.mjs';

/**
 * Helpers for the mock Go backend started by Playwright (scripts/mock-go-server.mjs).
 * Each test uses its own account (or resets the one it mutates), so tests can run in parallel.
 */

/**
 * Restores a seed account (password, must_change_password) and revokes its sessions.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} username
 */
export async function resetMockUser(request, username) {
  const response = await request.post(`${MOCK_GO_ORIGIN}/__mock/reset-user`, {
    data: { username },
  });
  expect(response.ok()).toBe(true);
}

/**
 * @param {import('@playwright/test').APIRequestContext} request
 * @returns {Promise<{ logins: number, refreshCalls: number, reuseDetected: number, activeSessions: number }>}
 */
export async function getMockStats(request) {
  const response = await request.get(`${MOCK_GO_ORIGIN}/__mock/stats`);
  return response.json();
}

/**
 * Signs in through the login form.
 * @param {import('@playwright/test').Page} page
 * @param {string} username
 * @param {string} password
 */
export async function loginViaForm(page, username, password) {
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();
}
