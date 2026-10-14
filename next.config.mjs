import { withSerwist } from '@serwist/turbopack';

// Server env (API_ORIGIN, SESSION_SECRET) is validated at server start (src/instrumentation.js),
// not here: the Docker build has no runtime secrets, and must not bake them into the image.
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Static security headers. The Content-Security-Policy header is set per request
 * (with a nonce) in `src/proxy.js`.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(isProduction
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
};

export default withSerwist(nextConfig);
