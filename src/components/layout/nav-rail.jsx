'use client';

import Link from 'next/link';
import { AppLogo } from '@/components/shared/app-logo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/layout/user-avatar';
import { useAppNavigation } from '@/components/layout/use-app-navigation';
import { cn } from '@/lib/utils';

const RAIL_ITEM =
  'flex size-12 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** Icon rail for md (768–1023px), with tooltips. */
export function NavRail() {
  const { items, activeItem, user } = useAppNavigation();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col items-center gap-4 bg-brand-dark py-4 md:flex lg:hidden">
      <AppLogo size={40} />
      <nav
        aria-label="Menu utama"
        className="flex flex-1 flex-col items-center gap-1 overflow-y-auto"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeItem?.key === item.key;
          const label = item.disabledReason ? `${item.label} — ${item.disabledReason}` : item.label;
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                {item.disabledReason ? (
                  <span
                    role="img"
                    aria-label={label}
                    className={cn(RAIL_ITEM, 'cursor-not-allowed text-brand-dark-muted opacity-50')}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      RAIL_ITEM,
                      'text-brand-dark-muted transition-colors hover:bg-brand-dark-active/70',
                      active && 'bg-brand-dark-active text-accent',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </Link>
                )}
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
      <UserAvatar name={user?.full_name ?? user?.username} />
    </aside>
  );
}
