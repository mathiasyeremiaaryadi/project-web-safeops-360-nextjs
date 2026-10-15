'use client';

import { usePathname } from 'next/navigation';
import { findNavItem, getBottomNavItems, getNavItems } from '@/config/navigation';
import { useSiteContext } from '@/hooks/use-site-context';
import { getPrimaryRole } from '@/lib/auth/permissions';
import { ROLE_LABELS } from '@/lib/constants';
import { useSession } from '@/features/auth/hooks/use-session';

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
  const contextLabel = useSiteContext().label;

  return {
    pathname,
    user,
    items,
    bottomItems: getBottomNavItems(user?.roles),
    activeItem,
    roleLabel: primaryRole ? ROLE_LABELS[primaryRole] : '',
    /** "Semua site" (Super Admin) or the names of the user's sites. */
    contextLabel,
    /** Form and detail pages (sub-routes) hide the bottom nav and use a sticky action bar. */
    isSubPage: Boolean(activeItem) && pathname !== activeItem?.href,
  };
}
