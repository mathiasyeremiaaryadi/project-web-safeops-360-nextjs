import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { cookieJar, goBackend, server } from './msw.js';
import { resetRefreshCache } from '@/server/go/session-tokens';

// Node's (undici) Request does not resolve relative URLs like browsers do. The app calls
// same-origin `/api/...`, so resolve against the jsdom location as a browser would.
if (typeof window !== 'undefined') {
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
}

// jsdom lacks a few layout APIs used by Radix (popover, dialog) and cmdk (combobox).
if (typeof window !== 'undefined') {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  if (typeof window !== 'undefined') cleanup();
  server.resetHandlers();
  goBackend.reset();
  cookieJar.clear();
  resetRefreshCache();
});
afterAll(() => server.close());
