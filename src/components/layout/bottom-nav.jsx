'use client';

import Link from 'next/link';
import { useAppNavigation } from '@/components/layout/use-app-navigation';
import { cn } from '@/lib/utils';

const ITEM =
  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset';

/** Bottom navigation for screens < 768px (5 items). */
export function BottomNav() {
  const { bottomItems, activeItem } = useAppNavigation();

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[68px] border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {bottomItems.map((item) => {
        const Icon = item.icon;
        const label = item.shortLabel ?? item.label;
        if (item.disabledReason) {
          return (
            <span
              key={item.key}
              aria-disabled="true"
              title={item.disabledReason}
              className={cn(ITEM, 'text-muted-foreground opacity-50')}
            >
              <Icon aria-hidden="true" className="size-6" />
              <span className="truncate">{label}</span>
              <span className="sr-only"> ({item.disabledReason})</span>
            </span>
          );
        }
        const active = activeItem?.key === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(ITEM, active ? 'font-semibold text-primary' : 'text-muted-foreground')}
          >
            <Icon aria-hidden="true" className="size-6" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
