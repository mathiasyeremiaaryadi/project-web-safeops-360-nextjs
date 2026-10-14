import {
  Boxes,
  ClipboardList,
  Database,
  FileText,
  Home,
  Inbox,
  ListChecks,
  Package,
  PackageX,
  ShieldAlert,
  UserRound,
  Users,
  Workflow,
} from 'lucide-react';
import { ROLES, ROUTES } from '@/lib/constants';
import { getPrimaryRole } from '@/lib/auth/permissions';

const { SUPER_ADMIN, ADMIN, ADMIN_WORKER, WORKER } = ROLES;

/**
 * Single source of navigation AND route access. Sidebar, rail, bottom nav, drawer and the
 * role guard all read this list.
 *
 * @typedef {object} NavItem
 * @property {string} key
 * @property {string} label
 * @property {string} href
 * @property {import('lucide-react').LucideIcon} icon
 * @property {string[]} roles Roles that see the item and may open the route (and sub-routes).
 * @property {string} [section] Sidebar group title.
 * @property {string} [shortLabel] Label in the mobile bottom nav.
 * @property {string[]} [bottomNavRoles] Roles that get this item in the mobile bottom nav.
 * @property {string} [disabledReason] Item is shown but not usable (e.g. backend gap).
 */

/** @type {readonly NavItem[]} */
export const NAV_ITEMS = Object.freeze([
  // ---- Super Admin (pages built in this phase) ----
  {
    key: 'dashboard',
    label: 'Beranda',
    shortLabel: 'Beranda',
    href: ROUTES.DASHBOARD,
    icon: Home,
    roles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER],
    bottomNavRoles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER],
  },
  {
    key: 'reports-tasks',
    label: 'Review laporan',
    shortLabel: 'Review',
    href: '/reports/tasks',
    icon: Inbox,
    roles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER],
    bottomNavRoles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER],
  },
  {
    key: 'safety-notes',
    label: 'Catatan safety',
    shortLabel: 'Safety',
    href: '/safety-notes',
    icon: ShieldAlert,
    roles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER],
    bottomNavRoles: [SUPER_ADMIN, ADMIN],
    // GET /pipeline-reports has no note-category filter yet (docs/ASSUMPTIONS.md G1).
    disabledReason: 'Menunggu dukungan API',
  },
  {
    key: 'master',
    label: 'Site & vendor',
    href: '/master',
    icon: Database,
    roles: [SUPER_ADMIN],
    section: 'Data master',
  },
  {
    key: 'pipelines',
    label: 'Pipeline & task',
    href: '/pipelines',
    icon: Workflow,
    roles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER],
    section: 'Data master',
  },
  {
    key: 'inventories',
    label: 'Inventory',
    href: '/inventories',
    icon: Package,
    roles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER],
    section: 'Data master',
  },
  {
    key: 'policies',
    label: 'SOP',
    href: '/policies',
    icon: FileText,
    roles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER, WORKER],
    section: 'Data master',
  },
  {
    key: 'reports-inventory',
    label: 'Laporan inventory',
    shortLabel: 'Lap. inv.',
    href: '/reports/inventory',
    icon: PackageX,
    roles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER, WORKER],
    section: 'Data master',
    bottomNavRoles: [ADMIN_WORKER, WORKER],
  },
  {
    key: 'users',
    label: 'Manajemen user',
    shortLabel: 'User',
    href: '/users',
    icon: Users,
    roles: [SUPER_ADMIN, ADMIN_WORKER],
    section: 'Administrasi',
    bottomNavRoles: [SUPER_ADMIN],
  },
  {
    key: 'audit-logs',
    label: 'Audit log',
    href: '/audit-logs',
    icon: ClipboardList,
    roles: [SUPER_ADMIN],
    section: 'Administrasi',
  },
  // ---- Worker (pages come in a later phase) ----
  {
    key: 'my-tasks',
    label: 'Tugas saya',
    shortLabel: 'Tugas',
    href: '/my-tasks',
    icon: ListChecks,
    roles: [WORKER],
    bottomNavRoles: [WORKER],
  },
  {
    key: 'inventory-catalog',
    label: 'Inventory vendor',
    shortLabel: 'Inventory',
    href: '/inventories',
    icon: Boxes,
    roles: [WORKER],
    bottomNavRoles: [WORKER],
  },
  // ---- Everyone ----
  {
    key: 'profile',
    label: 'Profil & sesi',
    shortLabel: 'Profil',
    href: ROUTES.PROFILE,
    icon: UserRound,
    roles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER, WORKER],
    section: 'Akun',
    bottomNavRoles: [SUPER_ADMIN, ADMIN, ADMIN_WORKER, WORKER],
  },
]);

/**
 * Menu items for a user, in display order (based on the user's primary role).
 * @param {readonly string[] | undefined} roles
 * @returns {NavItem[]}
 */
export function getNavItems(roles) {
  const role = getPrimaryRole(roles);
  return role ? NAV_ITEMS.filter((item) => item.roles.includes(role)) : [];
}

/**
 * Items of the mobile bottom nav (max 5).
 * @param {readonly string[] | undefined} roles
 */
export function getBottomNavItems(roles) {
  const role = getPrimaryRole(roles);
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.bottomNavRoles?.includes(role)).slice(0, 5);
}

/**
 * Whether `pathname` belongs to `href` (the page itself or one of its sub-routes).
 * @param {string} pathname
 * @param {string} href
 */
export function isPathWithin(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Nav item owning a pathname (longest matching href wins).
 * @param {string} pathname
 * @param {readonly NavItem[]} [items]
 * @returns {NavItem | null}
 */
export function findNavItem(pathname, items = NAV_ITEMS) {
  return (
    items
      .filter((item) => isPathWithin(pathname, item.href))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? null
  );
}

/**
 * Route guard: may a user with these roles open `pathname`? Routes that belong to no nav item
 * (e.g. /change-password) only require a session. Uses the same data as the menu.
 * @param {string} pathname
 * @param {readonly string[] | undefined} roles
 */
export function canAccessPath(pathname, roles) {
  const owners = NAV_ITEMS.filter((item) => isPathWithin(pathname, item.href));
  if (owners.length === 0) return true;
  const longest = Math.max(...owners.map((item) => item.href.length));
  return owners
    .filter((item) => item.href.length === longest)
    .some((item) => !item.disabledReason && item.roles.some((role) => roles?.includes(role)));
}

/**
 * First page after login.
 * @param {readonly string[] | undefined} roles
 */
export function getHomeRoute(roles) {
  return getNavItems(roles).find((item) => !item.disabledReason)?.href ?? ROUTES.PROFILE;
}
