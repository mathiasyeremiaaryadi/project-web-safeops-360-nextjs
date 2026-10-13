import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '@/mocks/server';
import { resetMockDb } from '@/mocks/handlers/auth';

// Node's (undici) Request does not resolve relative URLs like browsers do. The app calls
// same-origin `/api/v1/...`, so resolve against the jsdom location as a browser would.
const NodeRequest = globalThis.Request;
globalThis.Request = class Request extends NodeRequest {
  /**
   * @param {RequestInfo | URL} input
   * @param {RequestInit} [init]
   */
  constructor(input, init) {
    super(typeof input === 'string' ? new URL(input, window.location.href).href : input, init);
  }
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockDb();
});
afterAll(() => server.close());
