import { setupWorker } from 'msw/browser';
import { handlers } from '@/mocks/handlers';

/** @type {Promise<unknown> | null} */
let startPromise = null;

/**
 * Starts MSW in the browser (development only, `NEXT_PUBLIC_API_MOCKING=enabled`).
 * Idempotent: React Strict Mode runs effects twice, and MSW cannot be started twice.
 */
export function startMockWorker() {
  if (!startPromise) {
    const worker = setupWorker(...handlers);
    startPromise = worker.start({ onUnhandledRequest: 'bypass', quiet: true });
  }
  return startPromise;
}
