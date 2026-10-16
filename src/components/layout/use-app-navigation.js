'use client';

import { usePathname } from 'next/navigation';
import { findNavItem, getBottomNavItems, getNavItems } from '@/config/navigation';
import { useSiteContext } from '@/hooks/use-site-context';
import { can, getPrimaryRole } from '@/lib/auth/permissions';
import { ROLE_LABELS } from '@/lib/constants';
import { useSession } from '@/features/auth/hooks/use-session';
import { shiftOf, useMyTasks } from '@/features/my-tasks';

/**
 * Everything the shell needs about the current user and route, derived from
 * `config/navigation.js` (single source).
 */
export function useAppNavigation() {
  const pathname = usePathname();
  const { user } = useSession();
  const items = getNavItems(user?.roles);
  const activeItem = findNavItem(pathname, items);
  const primaryRole = getPrimaryRole(user?.roles);
  const site = useSiteContext();
  // A Worker's context is their vendor and today's shift (from their assignments).
  const worker = can(user, 'TASK_REPORT_WRITE');
  const todayTasks = useMyTasks('', { enabled: worker });
  const shift = worker ? shiftOf(todayTasks.data?.data ?? [])?.name : null;
  const shiftLabel = shift ? `Shift ${shift}` : null;

  return {
    pathname,
    user,
    items,
    bottomItems: getBottomNavItems(user?.roles),
    activeItem,
    roleLabel: primaryRole ? ROLE_LABELS[primaryRole] : '',
    /** Sidebar / breadcrumb: "Semua site", site names, "{vendor} · {sites}" or "{vendor} · Shift". */
    contextLabel: worker ? [site.shortLabel, shiftLabel].filter(Boolean).join(' · ') : site.label,
    /** Mobile top bar subtitle. */
    contextShortLabel: worker
      ? [shiftLabel, site.shortLabel].filter(Boolean).join(' · ')
      : site.shortLabel,
    /** Detail and form pages under a menu item: the header shows a back button. */
    isSubPage: Boolean(activeItem) && pathname !== activeItem?.href,
    /** Sub-pages and form pages hide the bottom nav on mobile and use a sticky action bar. */
    isFormPage:
      (Boolean(activeItem) && pathname !== activeItem?.href) || Boolean(activeItem?.formPage),
  };
}
