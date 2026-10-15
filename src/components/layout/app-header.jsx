'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { MobileDrawer } from '@/components/layout/mobile-drawer';
import { usePageTitle } from '@/components/layout/page-title';
import { HeaderSiteSwitcher, MobileSiteSubtitle } from '@/components/layout/site-switcher';
import { useAppNavigation } from '@/components/layout/use-app-navigation';

/**
 * - < 768px: 56px top bar with ☰ (or ← on sub-pages), page title and context subtitle.
 * - ≥ 768px: 64px header with a breadcrumb ("Administrasi / Manajemen user / Tambah User").
 * There is no notification button: the backend has no notification API.
 */
export function AppHeader() {
  const { activeItem, contextLabel, isSubPage } = useAppNavigation();
  const pageTitle = usePageTitle();
  const sectionLabel = activeItem?.label ?? 'SafeOps 360';
  const title = pageTitle ?? sectionLabel;
  const trail = activeItem?.section ?? contextLabel;

  return (
    <header className="sticky top-0 z-20 border-b bg-card">
      <div className="flex h-14 items-center gap-1 px-2 md:hidden">
        {isSubPage && activeItem ? (
          <Link
            href={activeItem.href}
            aria-label={`Kembali ke ${activeItem.label}`}
            className="inline-flex size-11 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft aria-hidden="true" className="size-6" />
          </Link>
        ) : (
          <MobileDrawer />
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-lg font-bold text-foreground">{title}</p>
          <MobileSiteSubtitle />
        </div>
      </div>

      <nav aria-label="Breadcrumb" className="hidden h-16 items-center px-6 md:flex lg:px-8">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm">
          <li className="shrink-0 text-muted-foreground">{trail}</li>
          <li aria-hidden="true" className="text-muted-foreground">
            /
          </li>
          {isSubPage && activeItem ? (
            <>
              <li className="shrink-0">
                <Link
                  href={activeItem.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {sectionLabel}
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted-foreground">
                /
              </li>
            </>
          ) : null}
          <li aria-current="page" className="truncate font-semibold text-foreground">
            {isSubPage ? title : sectionLabel}
          </li>
        </ol>
        <HeaderSiteSwitcher />
      </nav>
    </header>
  );
}
