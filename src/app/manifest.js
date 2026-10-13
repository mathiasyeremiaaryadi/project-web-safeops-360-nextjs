import { BRAND_COLORS } from '@/lib/constants';

/**
 * Web app manifest (served at /manifest.webmanifest).
 * @returns {import('next').MetadataRoute.Manifest}
 */
export default function manifest() {
  return {
    name: 'SafeOps 360',
    short_name: 'SafeOps',
    description: 'Operasional cleaning service dan safety di PLTU.',
    lang: 'id',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: BRAND_COLORS.THEME,
    background_color: BRAND_COLORS.BACKGROUND,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
