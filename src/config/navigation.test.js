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
  it('gives Super Admin the 14 menu items in order', () => {
    expect(getNavItems(SA).map((item) => item.label)).toEqual([
      'Beranda',
      'Progress vendor',
      'Review laporan',
      'Catatan safety',
      'SLA & maturity',
      'Site & vendor',
      'Pipeline & task',
      'Inventory',
      'SOP',
      'Laporan inventory',
      'Pengaturan SLA',
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
      null,
      null,
      'Data master',
      'Data master',
      'Data master',
      'Data master',
      'Data master',
      'Administrasi',
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
    expect(getNavItems([ROLES.WORKER, ROLES.SUPER_ADMIN])).toHaveLength(14);
  });

  it('opens "Progress vendor" to Super Admin / Admin, "Progress pipeline" to Admin vendor', () => {
    for (const role of [ROLES.SUPER_ADMIN, ROLES.ADMIN]) {
      expect(canAccessPath('/vendor-progress/v1', [role])).toBe(true);
      expect(canAccessPath('/pipeline-progress', [role])).toBe(false);
    }
    expect(canAccessPath('/vendor-progress', [ROLES.ADMIN_WORKER])).toBe(false);
    expect(canAccessPath('/pipeline-progress', [ROLES.ADMIN_WORKER])).toBe(true);
    expect(canAccessPath('/assignments', [ROLES.ADMIN_WORKER])).toBe(true);
    expect(canAccessPath('/assignments', [ROLES.ADMIN])).toBe(false);
    expect(canAccessPath('/vendor-progress', [ROLES.WORKER])).toBe(false);
  });

  it('SLA: dashboard for the managers, rules for Super Admin and Admin only', () => {
    for (const role of [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ADMIN_WORKER]) {
      expect(canAccessPath('/sla/detail', [role])).toBe(true);
    }
    for (const role of [ROLES.SUPER_ADMIN, ROLES.ADMIN]) {
      expect(canAccessPath('/sla/rules/new', [role])).toBe(true);
    }
    expect(canAccessPath('/sla/rules', [ROLES.ADMIN_WORKER])).toBe(false);
    expect(canAccessPath('/sla', [ROLES.WORKER])).toBe(false);
  });

  it('guards sub-routes with the owning menu item', () => {
    expect(canAccessPath('/users/123', SA)).toBe(true);
    expect(canAccessPath('/users/new', [ROLES.WORKER])).toBe(false);
    expect(canAccessPath('/tasks/report/9', [ROLES.WORKER])).toBe(true);
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

  it('gives Admin the site menu in mockup order, with users but without audit log', () => {
    const admin = [ROLES.ADMIN];
    expect(getNavItems(admin).map((item) => [item.section ?? '', item.label])).toEqual([
      ['', 'Beranda'],
      ['', 'Progress vendor'],
      ['', 'Review laporan'],
      ['', 'Catatan safety'],
      ['', 'SLA & maturity'],
      ['', 'Laporan inventory'],
      ['Data site', 'Vendor'],
      ['Data site', 'Pipeline & task'],
      ['Data site', 'Inventory'],
      ['Data site', 'SOP'],
      ['Data site', 'Pengaturan SLA'],
      ['Administrasi', 'Manajemen user'],
      ['Akun', 'Profil & sesi'],
    ]);
    expect(getBottomNavItems(admin).map((item) => item.shortLabel)).toEqual([
      'Beranda',
      'Review',
      'Safety',
      'Lap. inv.',
      'Profil',
    ]);
    expect(canAccessPath('/audit-logs', admin)).toBe(false);
    expect(canAccessPath('/users', admin)).toBe(true);
    expect(canAccessPath('/master', admin)).toBe(true);
    expect(canAccessPath('/reports/inventory/9', admin)).toBe(true);
    expect(getHomeRoute(admin)).toBe('/dashboard');
  });

  it('gives Admin vendor the 11 vendor menu items, without master, safety notes and audit log', () => {
    const vendor = [ROLES.ADMIN_WORKER];
    expect(getNavItems(vendor).map((item) => [item.section ?? '', item.label])).toEqual([
      ['', 'Beranda'],
      ['', 'Progress pipeline'],
      ['', 'Review laporan'],
      ['', 'Laporan inventory'],
      ['', 'SLA & maturity'],
      ['Data vendor', 'Inventory'],
      ['Data vendor', 'SOP'],
      ['Data vendor', 'Pipeline item'],
      ['Data vendor', 'Penugasan worker'],
      ['Akun', 'Manajemen user'],
      ['Akun', 'Profil & sesi'],
    ]);
    expect(getBottomNavItems(vendor).map((item) => item.shortLabel)).toEqual([
      'Beranda',
      'Review',
      'Lap. inv.',
      'Inventory',
      'Profil',
    ]);
    for (const path of ['/master', '/safety-notes', '/audit-logs']) {
      expect(canAccessPath(path, vendor)).toBe(false);
    }
    expect(canAccessPath('/pipelines/p1', vendor)).toBe(true);
    expect(canAccessPath('/users/new', vendor)).toBe(true);
    expect(getHomeRoute(vendor)).toBe('/dashboard');
  });

  it('gives Worker the 5 work items, the bottom nav and /tasks as home', () => {
    const worker = [ROLES.WORKER];
    expect(getNavItems(worker).map((item) => [item.section ?? '', item.label])).toEqual([
      ['', 'Tugas hari ini'],
      ['', 'Riwayat laporan'],
      ['', 'Lapor inventory'],
      ['', 'SOP'],
      ['Akun', 'Profil & sesi'],
    ]);
    expect(getBottomNavItems(worker).map((item) => item.shortLabel)).toEqual([
      'Tugas',
      'Riwayat',
      'Lapor',
      'SOP',
      'Profil',
    ]);
    expect(getHomeRoute(worker)).toBe('/tasks');
    for (const path of [
      '/dashboard',
      '/reports/tasks',
      '/master',
      '/pipelines',
      '/inventories',
      '/users',
      '/audit-logs',
    ]) {
      expect(canAccessPath(path, worker), path).toBe(false);
    }
    for (const path of [
      '/tasks',
      '/tasks/report/r1',
      '/history',
      '/inventory-reports/new',
      '/policies',
    ]) {
      expect(canAccessPath(path, worker), path).toBe(true);
    }
  });
});
