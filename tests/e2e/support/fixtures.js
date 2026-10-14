/*
 * Test data for the mocked API (see mock-api.js). Shapes follow what the real Go backend sends
 * (list envelopes keyed by resource, `is_active` booleans, nested names) so the tolerant schemas
 * are exercised too. A fresh copy is made for every test.
 */

export const SUPER_ADMIN = {
  id: 'me',
  username: 'superadmin',
  full_name: 'Hendra Wijaya',
  roles: ['SUPER_ADMIN'],
  must_change_password: false,
};

export function createFixtures() {
  return {
    sites: [
      { id: 's1', code: 'PTN', name: 'PLTU Paiton', site_type: 'PLTU', is_active: true },
      { id: 's2', code: 'GRT', name: 'PLTGU Grati', site_type: 'PLTGU', is_active: true },
    ],
    vendors: [
      { id: 'v1', code: 'BJ', name: 'PT Bersih Jaya', status: 'ACTIVE', site_ids: ['s1'] },
      { id: 'v2', code: 'KA', name: 'PT Karya Aman', status: 'ACTIVE', sites: [{ id: 's2' }] },
    ],
    items: [
      { id: 'i1', name: 'Sapu dan pel lantai', description: 'Area turbin', status: 'ACTIVE' },
      { id: 'i2', name: 'Lap panel', status: 'ACTIVE' },
      { id: 'i3', name: 'Kosongkan sampah', status: 'INACTIVE' },
    ],
    users: [
      { ...SUPER_ADMIN, is_active: true, last_login_at: '2026-10-14T00:30:00Z' },
      {
        id: 'u1',
        username: 'agus',
        full_name: 'Agus Pratama',
        roles: ['WORKER'],
        is_active: true,
        last_login_at: '2026-10-14T01:00:00Z',
        scopes: { vendor_ids: ['v1'] },
      },
      {
        id: 'u2',
        username: 'siti',
        full_name: 'Siti Rahma',
        roles: ['ADMIN'],
        is_active: false,
        scopes: { site_ids: ['s1'] },
      },
    ],
    pipelines: [
      {
        id: 'p1',
        vendor_id: 'v1',
        name: 'Cleaning Turbine Hall',
        description: 'Lantai 1',
        status: 'ACTIVE',
        item_count: 2,
      },
      { id: 'p2', vendor_id: 'v2', name: 'Cleaning Boiler', status: 'INACTIVE', item_count: 0 },
    ],
    pipelineItems: [
      {
        id: 'pi1',
        sort_order: 1,
        status: 'ACTIVE',
        item: { id: 'i1', name: 'Sapu dan pel lantai' },
      },
      { id: 'pi2', sort_order: 2, status: 'ACTIVE', item: { id: 'i2', name: 'Lap panel' } },
    ],
    inventories: [
      {
        id: 'n1',
        vendor_id: 'v1',
        item: 'APAR 6 kg',
        jenis_item: 'Alat pemadam',
        qty: 12,
        status_condition: 'GOOD',
        is_active: true,
        updated_at: '2026-10-10T03:00:00Z',
      },
      {
        id: 'n2',
        vendor_id: 'v2',
        item: 'Helm safety',
        jenis_item: 'APD',
        qty: 0,
        status_condition: 'DAMAGED',
        is_active: true,
      },
    ],
    policies: [
      {
        id: 'q1',
        vendor_id: 'v1',
        name: 'SOP Kerja di Ketinggian',
        status: 'ACTIVE',
        size: 1258291,
        created_at: '2026-09-01T00:00:00Z',
      },
    ],
    pipelineReports: [
      {
        id: 'r1',
        status: 'SUBMITTED',
        revision_status: 'NONE',
        shift: 1,
        report_date: '2026-10-14',
        vendor_id: 'v1',
        user_id: 'u1',
        submitted_at: '2026-10-14T02:10:00Z',
        pipeline_item: {
          item: { name: 'Sapu dan pel lantai' },
          pipeline: { name: 'Turbine Hall' },
        },
        detail: {
          opened_at: '2026-10-14T01:00:00Z',
          closed_at: '2026-10-14T02:05:00Z',
          note_category: 'NEAR_MISS',
          note: 'Lantai licin dekat pintu 3.',
        },
      },
      {
        id: 'r2',
        status: 'SUBMITTED',
        revision_status: 'NONE',
        shift: 2,
        report_date: '2026-10-14',
        vendor_id: 'v1',
        user_id: 'u1',
        submitted_at: '2026-10-14T09:00:00Z',
        pipeline_item: { item: { name: 'Lap panel' }, pipeline: { name: 'Turbine Hall' } },
      },
    ],
    inventoryReports: [
      {
        id: 'ir1',
        vendor_id: 'v1',
        inventory_id: 'n1',
        report_type: 'DAMAGED',
        status: 'SUBMITTED',
        user: { full_name: 'Agus Pratama' },
        description: 'Selang APAR retak.',
        created_at: '2026-10-14T03:00:00Z',
      },
      {
        id: 'ir2',
        vendor_id: 'v2',
        report_type: 'REQUEST',
        status: 'IN_REVIEW',
        user: { full_name: 'Siti Rahma' },
        description: 'Butuh 5 helm safety.',
        created_at: '2026-10-13T03:00:00Z',
      },
    ],
    auditLogs: [
      {
        id: 1,
        action: 'LOGIN',
        entity: 'auth',
        actor_id: 'u1',
        ip: '10.0.0.5',
        created_at: '2026-10-14T01:00:00Z',
      },
      {
        id: 2,
        action: 'UPDATE',
        entity: 'users',
        actor: { id: 'me', full_name: 'Hendra Wijaya', username: 'superadmin' },
        ip: '10.0.0.6',
        summary: 'Mengubah role user',
        before: { roles: ['WORKER'] },
        after: { roles: ['ADMIN'] },
        created_at: '2026-10-14T02:00:00Z',
      },
    ],
    dashboard: {
      data: {
        pipeline_reports: { PENDING: 6, IN_PROGRESS: 4, SUBMITTED: 9, COMPLETED: 29 },
        pipeline_revisions: { REQUESTED: 4 },
      },
    },
    daily: {
      data: [
        {
          vendor_id: 'v1',
          vendor_name: 'PT Bersih Jaya',
          total_tasks: 20,
          completed: 14,
          submitted: 3,
          revision_requested: 1,
        },
        {
          vendor_id: 'v2',
          vendor_name: 'PT Karya Aman',
          total_tasks: 16,
          completed: 9,
          submitted: 4,
          revision_requested: 2,
          pending: 1,
        },
      ],
    },
  };
}
