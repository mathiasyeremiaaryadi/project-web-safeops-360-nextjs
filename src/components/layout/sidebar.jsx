'use client';

import { AppLogo } from '@/components/shared/app-logo';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { SidebarSiteSwitcher } from '@/components/layout/site-switcher';
import { UserAvatar } from '@/components/layout/user-avatar';
import { useAppNavigation } from '@/components/layout/use-app-navigation';
import { cn } from '@/lib/utils';

/**
 * Sidebar content: logo, site context (switcher for a user with several sites), menu and user card.
 * Used by the desktop sidebar and the mobile drawer.
 * @param {{ onNavigate?: () => void }} props
 */
export function SidebarContent({ onNavigate }) {
  const { items, activeItem, user, roleLabel } = useAppNavigation();

  return (
    <div className="flex h-full flex-col gap-5 px-3 py-5 text-brand-dark-foreground">
      <div className="flex items-center gap-3 px-2">
        <AppLogo size={40} />
        <div className="leading-tight">
          <p className="text-base font-bold">SafeOps 360</p>
          <p className="text-xs text-brand-dark-muted">Safety & Operations</p>
        </div>
      </div>

      <SidebarSiteSwitcher />

      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <SidebarNav items={items} activeItem={activeItem} onNavigate={onNavigate} />
      </div>

      <div className="flex items-center gap-3 border-t border-brand-dark-foreground/15 px-2 pt-4">
        <UserAvatar name={user?.full_name ?? user?.username} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{user?.full_name ?? user?.username}</p>
          <p className="truncate text-xs text-brand-dark-muted">{roleLabel}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Fixed sidebar for lg+ screens.
 * @param {{ className?: string }} props
 */
export function Sidebar({ className }) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden bg-brand-dark lg:block lg:w-[232px] xl:w-[248px] 2xl:w-64',
        className,
      )}
    >
      <SidebarContent />
    </aside>
  );
}
