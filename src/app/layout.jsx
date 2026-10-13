import { Geist, Geist_Mono } from 'next/font/google';
import { connection } from 'next/server';
import { AppProviders } from '@/providers/app-providers';
import { BRAND_COLORS } from '@/lib/constants';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  applicationName: 'SafeOps 360',
  title: {
    default: 'SafeOps 360',
    template: '%s · SafeOps 360',
  },
  description: 'Operasional cleaning service dan safety di PLTU.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SafeOps 360',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport = {
  themeColor: BRAND_COLORS.THEME,
  width: 'device-width',
  initialScale: 1,
};

/**
 * Root layout.
 * @param {{ children: import('react').ReactNode }} props
 */
export default async function RootLayout({ children }) {
  // Every page is rendered per request so Next.js can apply the CSP nonce set in `src/proxy.js`.
  await connection();

  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* Browser extensions (ColorZilla, Grammarly, …) inject attributes into <body> before
          hydration. This only ignores <body>'s own attributes, not its children. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
