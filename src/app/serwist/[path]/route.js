import { createSerwistRoute } from '@serwist/turbopack';

/*
 * Builds and serves the service worker at /serwist/sw.js (source: src/app/sw.js).
 * Precache = static build output (JS, CSS, fonts, images) + icons + the offline page.
 * HTML pages and /api/ are never precached.
 */
const revision = crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: 'src/app/sw.js',
    useNativeEsbuild: true,
    globPatterns: [
      '.next/static/**/*.{js,css,woff,woff2,ico,png,svg,webp}',
      'public/icons/**/*.{png,svg}',
    ],
    additionalPrecacheEntries: [{ url: '/offline', revision }],
  },
);
