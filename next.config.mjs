import { withSerwist } from '@serwist/turbopack';
import { getServerEnv } from './src/config/env.js';

// Fails `next dev` / `next build` when required environment variables are missing.
const env = getServerEnv();
const isDev = env.NODE_ENV === 'development';

/**
 * Static security headers. The Content-Security-Policy header is set per request
 * (with a nonce) in `src/proxy.js`.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server (.next/standalone) for the Docker image.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/serwist/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
  async rewrites() {
    // Dev only: forward same-origin API calls to the Go backend.
    // In production the reverse proxy serves /api/v1 on the same origin.
    if (!isDev || !env.API_ORIGIN) return [];
    return [{ source: '/api/v1/:path*', destination: `${env.API_ORIGIN}/api/v1/:path*` }];
  },
};

export default withSerwist(nextConfig);
