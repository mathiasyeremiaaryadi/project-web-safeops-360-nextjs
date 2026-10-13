import { NextResponse } from 'next/server';

/**
 * Builds the Content-Security-Policy for one request.
 * @param {string} nonce
 * @param {boolean} isDev
 */
function buildCsp(nonce, isDev) {
  return [
    "default-src 'self'",
    // Next.js attaches the nonce to its framework and inline scripts automatically.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Inline styles are needed by Radix (style attributes) and sonner (runtime <style>).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Generates a per-request nonce and sets a strict CSP header.
 * @param {import('next/server').NextRequest} request
 */
export function proxy(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api|_next/static|_next/image|serwist|mockServiceWorker.js|favicon.ico|icons|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
