import { describe, expect, it } from 'vitest';
import { can, describeAccess, getPrimaryRole } from '@/lib/auth/permissions';
import { ROLES } from '@/lib/constants';

describe('permissions (BRD section 7)', () => {
  it('lets only Super Admin set roles/scopes and read the audit log', () => {
    expect(can({ roles: [ROLES.SUPER_ADMIN] }, 'USER_ACCESS_ADMIN')).toBe(true);
    expect(can({ roles: [ROLES.ADMIN_WORKER] }, 'USER_ACCESS_ADMIN')).toBe(false);
    expect(can({ roles: [ROLES.ADMIN] }, 'AUDIT_LOG_READ')).toBe(false);
  });

  it('lets Admin Worker manage users but not pipelines', () => {
    const aw = { roles: [ROLES.ADMIN_WORKER] };
    expect(can(aw, 'USER_MANAGE')).toBe(true);
    expect(can(aw, 'PIPELINE_WRITE')).toBe(false);
    expect(can(aw, 'PIPELINE_ITEM_WRITE')).toBe(true);
  });

  it('never lets a Worker review reports', () => {
    const worker = { roles: [ROLES.WORKER] };
    expect(can(worker, 'PIPELINE_REPORT_REVIEW')).toBe(false);
    expect(can(worker, 'INVENTORY_REPORT_CREATE')).toBe(true);
  });

  it('handles missing users and multiple roles', () => {
    expect(can(null, 'DASHBOARD_READ')).toBe(false);
    expect(can({ roles: [ROLES.WORKER, ROLES.ADMIN] }, 'PIPELINE_WRITE')).toBe(true);
    expect(getPrimaryRole([ROLES.WORKER, ROLES.ADMIN])).toBe(ROLES.ADMIN);
  });

  it('describes access for the "Ringkasan akses" panel from the matrix', () => {
    const { allowed, denied } = describeAccess([ROLES.WORKER]);
    expect(allowed).toContain('Membuat laporan inventory');
    expect(denied).toContain('Melihat audit log');
    expect(allowed.length + denied.length).toBe(16);
  });
});

describe('permissions of Admin (Admin Site)', () => {
  const admin = { roles: [ROLES.ADMIN] };

  it.each([
    ['DASHBOARD_READ', true],
    ['PIPELINE_REPORT_READ', true],
    ['PIPELINE_REPORT_REVIEW', true],
    ['INVENTORY_REPORT_REVIEW', false],
    ['SITE_VENDOR_READ', true],
    ['SITE_VENDOR_WRITE', false],
    ['ITEM_WRITE', false],
    ['PIPELINE_WRITE', true],
    ['PIPELINE_ITEM_WRITE', true],
    ['INVENTORY_POLICY_READ', true],
    ['INVENTORY_POLICY_WRITE', true],
    ['USER_MANAGE', false],
    ['USER_ACCESS_ADMIN', false],
    ['AUDIT_LOG_READ', false],
    ['ALL_SITES_READ', false],
  ])('%s → %s', (permission, allowed) => {
    expect(can(admin, /** @type {any} */ (permission))).toBe(allowed);
  });

  it('keeps inventory report review for Super Admin and Admin Worker', () => {
    expect(can({ roles: [ROLES.SUPER_ADMIN] }, 'INVENTORY_REPORT_REVIEW')).toBe(true);
    expect(can({ roles: [ROLES.ADMIN_WORKER] }, 'INVENTORY_REPORT_REVIEW')).toBe(true);
  });
});
