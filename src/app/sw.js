import { Serwist, NetworkOnly, CacheFirst, StaleWhileRevalidate, ExpirationPlugin } from 'serwist';

/*
 * Service worker (bundled by @serwist/turbopack, served at /serwist/sw.js).
 *
 * Rules:
 * - Only static assets (JS, CSS, fonts, icons) are precached / cached.
 * - Requests to /api/ are NEVER cached (NetworkOnly).
 * - HTML pages are not cached (they carry a per-request CSP nonce and user state);
 *   when the network is down the precached /offline page is shown instead.
 */

const runtimeCaching = [
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'next-static',
      plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
  {
    matcher: ({ request, sameOrigin }) =>
      sameOrigin && (request.destination === 'font' || request.destination === 'image'),
    handler: new StaleWhileRevalidate({
      cacheName: 'static-media',
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
  {
    // Everything else (pages, RSC payloads, cross-origin) goes straight to the network.
    matcher: () => true,
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
