import { describe, expect, it } from 'vitest';
import {
  canAccessPath,
  findNavItem,
  getBottomNavItems,
  getHomeRoute,
  getNavItems,
} from '@/config/navigation';
import { ROLES } from '@/lib/constants';

const SA = [ROLES.SUPER_ADMIN];

describe('navigation config', () => {
  it('gives Super Admin the 11 menu items in order', () => {
    expect(getNavItems(SA).map((item) => item.label)).toEqual([
      'Beranda',
      'Review laporan',
      'Catatan safety',
      'Site & vendor',
      'Pipeline & task',
      'Inventory',
      'SOP',
      'Laporan inventory',
      'Manajemen user',
      'Audit log',
      'Profil & sesi',
    ]);
  });

  it('groups Super Admin items into the documented sections', () => {
    const sections = getNavItems(SA).map((item) => item.section ?? null);
    expect(sections).toEqual([
      null,
      null,
      null,
      'Data master',
      'Data master',
      'Data master',
      'Data master',
      'Data master',
      'Administrasi',
      'Administrasi',
      'Akun',
    ]);
  });

  it('gives Super Admin a 5-item bottom nav', () => {
    expect(getBottomNavItems(SA).map((item) => item.shortLabel)).toEqual([
      'Beranda',
      'Review',
      'Safety',
      'User',
      'Profil',
    ]);
  });

  it.each([ROLES.ADMIN, ROLES.ADMIN_WORKER, ROLES.WORKER])('hides "Audit log" from %s', (role) => {
    expect(getNavItems([role]).map((item) => item.label)).not.toContain('Audit log');
    expect(canAccessPath('/audit-logs', [role])).toBe(false);
  });

  it('uses the most privileged role for multi-role users', () => {
    expect(getNavItems([ROLES.WORKER, ROLES.SUPER_ADMIN])).toHaveLength(11);
  });

  it('guards sub-routes with the owning menu item', () => {
    expect(canAccessPath('/users/123', SA)).toBe(true);
    expect(canAccessPath('/users/new', [ROLES.WORKER])).toBe(false);
    expect(canAccessPath('/reports/inventory/9', [ROLES.WORKER])).toBe(true);
    expect(findNavItem('/reports/tasks/42')?.key).toBe('reports-tasks');
  });

  it('blocks a menu item that waits for backend support', () => {
    expect(canAccessPath('/safety-notes', SA)).toBe(false);
  });

  it('allows routes outside the menu to any signed-in user', () => {
    expect(canAccessPath('/change-password', [ROLES.WORKER])).toBe(true);
  });

  it('sends Super Admin to /dashboard after login', () => {
    expect(getHomeRoute(SA)).toBe('/dashboard');
  });
});
