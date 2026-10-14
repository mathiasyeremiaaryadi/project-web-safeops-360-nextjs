/*
 * Seed data of the mock Go backend. Shapes follow docs/ASSUMPTIONS.md. Plain JS only (this file
 * is also loaded by `node scripts/mock-go-server.mjs`, without the `@/` alias).
 */

/** Deterministic, valid v4-style UUID for seed rows. @param {number} n */
export const seedId = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** `YYYY-MM-DD` in Asia/Jakarta (the app's default time zone). @param {Date} [now] */
export function jakartaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
}

/** ISO timestamp `hoursAgo` hours before now. @param {number} hoursAgo */
const ago = (hoursAgo) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

export const SITE = { PAITON: seedId(101), SURALAYA: seedId(102), TANJUNG_JATI: seedId(103) };
export const VENDOR = {
  BERSIH_JAYA: seedId(201),
  KARYA_AMAN: seedId(202),
  SINAR_PRIMA: seedId(203),
};
const ITEM = {
  SAPU: seedId(301),
  PEL: seedId(302),
  SAMPAH: seedId(303),
  TOILET: seedId(304),
  APAR: seedId(305),
};
const PIPELINE = { TURBIN: seedId(401), CONTROL_ROOM: seedId(402) };
const PI = { A: seedId(501), B: seedId(502), C: seedId(503), D: seedId(504) };

/** Accounts. `password` is mock-only (never returned by the API). */
function users() {
  const base = {
    email: null,
    phone: null,
    is_active: true,
    locked_until: null,
    must_change_password: false,
  };
  return [
    {
      ...base,
      id: '1f2e3d4c-5b6a-4978-8a1b-2c3d4e5f6a7b',
      username: 'superadmin',
      full_name: 'Hendra Wijaya',
      email: 'hendra.wijaya@example.com',
      password: 'Admin12345',
      roles: ['SUPER_ADMIN'],
      scopes: { site_ids: [], vendor_ids: [] },
      last_login_at: ago(0.2),
    },
    {
      ...base,
      id: '6f1c2a0e-6c3b-4b8e-9a51-1d2f3e4a5b61',
      username: 'budi.santoso',
      full_name: 'Budi Santoso',
      password: 'rahasia123',
      roles: ['WORKER'],
      scopes: { site_ids: [], vendor_ids: [VENDOR.BERSIH_JAYA] },
      last_login_at: ago(2),
    },
    {
      ...base,
      id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
      username: 'agus.pratama',
      full_name: 'Agus Pratama',
      password: 'Kp7mw2Rq',
      roles: ['WORKER'],
      must_change_password: true,
      scopes: { site_ids: [], vendor_ids: [VENDOR.BERSIH_JAYA] },
      last_login_at: null,
    },
    {
      ...base,
      id: '3c2b1a09-8f7e-4d6c-9b5a-4e3d2c1b0a9f',
      username: 'sari.wulandari',
      full_name: 'Sari Wulandari',
      password: 'Sementara1',
      roles: ['ADMIN_WORKER'],
      must_change_password: true,
      scopes: { site_ids: [], vendor_ids: [VENDOR.BERSIH_JAYA] },
      last_login_at: null,
    },
    {
      ...base,
      id: seedId(11),
      username: 'rina.admin',
      full_name: 'Rina Kusuma',
      password: 'Admin12345',
      roles: ['ADMIN'],
      scopes: { site_ids: [SITE.PAITON], vendor_ids: [] },
      last_login_at: ago(5),
    },
    {
      ...base,
      id: seedId(12),
      username: 'dewi.lestari',
      full_name: 'Dewi Lestari',
      password: 'Kunci12345',
      roles: ['WORKER'],
      locked_until: new Date(Date.now() + 15 * 60_000).toISOString(),
      scopes: { site_ids: [], vendor_ids: [VENDOR.KARYA_AMAN] },
      last_login_at: ago(26),
    },
    {
      ...base,
      id: seedId(13),
      username: 'siti.rahma',
      full_name: 'Siti Rahmawati',
      password: 'Nonaktif123',
      roles: ['WORKER'],
      is_active: false,
      scopes: { site_ids: [], vendor_ids: [VENDOR.KARYA_AMAN] },
      last_login_at: ago(24 * 40),
    },
  ].map((user) => ({ ...user, created_at: ago(24 * 60) }));
}

export function createSeed(today = jakartaDate()) {
  const sites = [
    { id: SITE.PAITON, code: 'PTN', name: 'PLTU Paiton', site_type: 'PLTU', status: 'ACTIVE' },
    { id: SITE.SURALAYA, code: 'SRY', name: 'PLTU Suralaya', site_type: 'PLTU', status: 'ACTIVE' },
    {
      id: SITE.TANJUNG_JATI,
      code: 'TJB',
      name: 'PLTU Tanjung Jati B',
      site_type: null,
      status: 'INACTIVE',
    },
  ];
  const vendors = [
    {
      id: VENDOR.BERSIH_JAYA,
      code: 'BJ',
      name: 'PT Bersih Jaya',
      site_ids: [SITE.PAITON],
      status: 'ACTIVE',
    },
    {
      id: VENDOR.KARYA_AMAN,
      code: 'KA',
      name: 'PT Karya Aman',
      site_ids: [SITE.PAITON, SITE.SURALAYA],
      status: 'ACTIVE',
    },
    {
      id: VENDOR.SINAR_PRIMA,
      code: 'SPS',
      name: 'PT Sinar Prima Servis',
      site_ids: [SITE.SURALAYA],
      status: 'ACTIVE',
    },
  ];
  const items = [
    {
      id: ITEM.SAPU,
      name: 'Sapu area turbin',
      description: 'Lantai 1 dan 2 gedung turbin',
      status: 'ACTIVE',
    },
    { id: ITEM.PEL, name: 'Pel lantai control room', description: null, status: 'ACTIVE' },
    {
      id: ITEM.SAMPAH,
      name: 'Buang sampah area boiler',
      description: 'Termasuk pemilahan B3',
      status: 'ACTIVE',
    },
    { id: ITEM.TOILET, name: 'Bersihkan toilet', description: null, status: 'ACTIVE' },
    { id: ITEM.APAR, name: 'Cek kebersihan APAR', description: null, status: 'INACTIVE' },
  ];
  const pipelines = [
    {
      id: PIPELINE.TURBIN,
      vendor_id: VENDOR.BERSIH_JAYA,
      name: 'Cleaning harian turbin',
      description: 'Alur pagi shift 1',
      status: 'ACTIVE',
    },
    {
      id: PIPELINE.CONTROL_ROOM,
      vendor_id: VENDOR.KARYA_AMAN,
      name: 'Cleaning control room',
      description: null,
      status: 'ACTIVE',
    },
  ];
  const pipelineItems = [
    { id: PI.A, pipeline_id: PIPELINE.TURBIN, item_id: ITEM.SAPU, sort_order: 1, status: 'ACTIVE' },
    {
      id: PI.B,
      pipeline_id: PIPELINE.TURBIN,
      item_id: ITEM.SAMPAH,
      sort_order: 2,
      status: 'ACTIVE',
    },
    {
      id: PI.C,
      pipeline_id: PIPELINE.CONTROL_ROOM,
      item_id: ITEM.PEL,
      sort_order: 1,
      status: 'ACTIVE',
    },
    {
      id: PI.D,
      pipeline_id: PIPELINE.CONTROL_ROOM,
      item_id: ITEM.TOILET,
      sort_order: 2,
      status: 'INACTIVE',
    },
  ];
  const inventories = [
    {
      id: seedId(601),
      vendor_id: VENDOR.BERSIH_JAYA,
      item: 'Mesin poles lantai',
      jenis_item: 'Mesin',
      qty: 2,
      status_condition: 'DAMAGED',
      status: 'ACTIVE',
      image_key: 'inv/601.jpg',
      updated_at: ago(3),
    },
    {
      id: seedId(602),
      vendor_id: VENDOR.BERSIH_JAYA,
      item: 'Kantong sampah besar',
      jenis_item: 'Habis pakai',
      qty: 120,
      status_condition: 'GOOD',
      status: 'ACTIVE',
      image_key: null,
      updated_at: ago(30),
    },
    {
      id: seedId(603),
      vendor_id: VENDOR.SINAR_PRIMA,
      item: 'Tangga lipat 2 m',
      jenis_item: 'Alat',
      qty: 1,
      status_condition: 'MAINTENANCE',
      status: 'ACTIVE',
      image_key: null,
      updated_at: ago(50),
    },
    {
      id: seedId(604),
      vendor_id: VENDOR.KARYA_AMAN,
      item: 'Vacuum cleaner',
      jenis_item: 'Mesin',
      qty: 3,
      status_condition: 'LOST',
      status: 'ACTIVE',
      image_key: null,
      updated_at: ago(80),
    },
  ];
  const policies = [
    {
      id: seedId(701),
      vendor_id: VENDOR.BERSIH_JAYA,
      name: 'SOP Kebersihan Area Turbin',
      status: 'ACTIVE',
      file_key: 'pol/701.pdf',
      file_size: 482_000,
      created_at: ago(200),
      updated_at: ago(100),
    },
    {
      id: seedId(702),
      vendor_id: VENDOR.KARYA_AMAN,
      name: 'SOP Penggunaan APD',
      status: 'ACTIVE',
      file_key: 'pol/702.pdf',
      file_size: 1_250_000,
      created_at: ago(300),
      updated_at: ago(300),
    },
  ];
  const report = (n, pipelineItemId, userId, shift, status, revision, hours, detail = null) => ({
    id: seedId(n),
    pipeline_item_id: pipelineItemId,
    user_id: userId,
    shift,
    report_date: today,
    status,
    revision_status: revision,
    created_at: ago(hours + 1),
    updated_at: ago(hours),
    detail,
  });
  const budi = '6f1c2a0e-6c3b-4b8e-9a51-1d2f3e4a5b61';
  const pipelineReports = [
    report(801, PI.A, budi, 1, 'SUBMITTED', 'NONE', 2, {
      open_date: ago(3),
      closed_date: ago(2.2),
      note_category: 'UNSAFE_CONDITION',
      notes: 'Genangan oli di bawah pompa B, sudah diberi rambu sementara',
      evidence_before_url: null,
      evidence_after_url: null,
    }),
    report(802, PI.B, budi, 1, 'SUBMITTED', 'RESUBMITTED', 1, {
      open_date: ago(2),
      closed_date: ago(1.4),
      note_category: null,
      notes: 'Sampah B3 dipisah',
      evidence_before_url: null,
      evidence_after_url: null,
    }),
    report(803, PI.C, seedId(12), 2, 'COMPLETED', 'NONE', 6, {
      open_date: ago(8),
      closed_date: ago(7),
      note_category: 'NEAR_MISS',
      notes: 'Hampir terpeleset di lantai basah',
      evidence_before_url: null,
      evidence_after_url: null,
    }),
    report(804, PI.A, seedId(12), 2, 'SUBMITTED', 'REQUESTED', 4, {
      open_date: ago(5),
      closed_date: ago(4.5),
      note_category: null,
      notes: null,
      evidence_before_url: null,
      evidence_after_url: null,
    }),
    report(805, PI.C, budi, 3, 'IN_PROGRESS', 'NONE', 0.5),
    report(806, PI.B, seedId(12), 3, 'REJECTED', 'NONE', 10, {
      open_date: ago(12),
      closed_date: ago(11),
      note_category: null,
      notes: 'Foto sesudah buram',
      evidence_before_url: null,
      evidence_after_url: null,
    }),
  ];
  const inventoryReports = [
    {
      id: seedId(901),
      vendor_id: VENDOR.BERSIH_JAYA,
      inventory_id: seedId(601),
      user_id: budi,
      report_type: 'DAMAGED',
      description: 'Mesin poles lantai tidak mau menyala',
      evidence_url: null,
      status: 'SUBMITTED',
      review_reason: null,
      created_at: ago(1),
    },
    {
      id: seedId(902),
      vendor_id: VENDOR.BERSIH_JAYA,
      inventory_id: seedId(602),
      user_id: budi,
      report_type: 'REQUEST',
      description: 'Kantong sampah besar tinggal 10',
      evidence_url: null,
      status: 'IN_REVIEW',
      review_reason: null,
      created_at: ago(12),
    },
    {
      id: seedId(903),
      vendor_id: VENDOR.SINAR_PRIMA,
      inventory_id: seedId(603),
      user_id: seedId(12),
      report_type: 'DAMAGED',
      description: 'Engsel tangga lipat longgar',
      evidence_url: null,
      status: 'APPROVED',
      review_reason: null,
      created_at: ago(30),
    },
  ];
  const auditLogs = [
    {
      id: 5,
      action: 'LOGIN',
      entity: 'auth',
      entity_id: null,
      actor_username: 'rina.admin',
      ip: '10.12.4.21',
      summary: 'Login berhasil',
      before: null,
      after: null,
      created_at: ago(1),
    },
    {
      id: 4,
      action: 'UPDATE',
      entity: 'user_scopes',
      entity_id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
      actor_username: 'superadmin',
      ip: '10.12.1.3',
      summary: 'Scope agus.pratama diubah',
      before: { vendor: 'PT Karya Aman' },
      after: { vendor: 'PT Bersih Jaya' },
      created_at: ago(2),
    },
    {
      id: 3,
      action: 'LOGIN_FAILED',
      entity: 'auth',
      entity_id: null,
      actor_username: null,
      ip: '10.12.9.77',
      summary: 'Username tidak terdaftar',
      before: null,
      after: null,
      created_at: ago(3),
    },
    {
      id: 2,
      action: 'CREATE',
      entity: 'users',
      entity_id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
      actor_username: 'superadmin',
      ip: '10.12.1.3',
      summary: 'User agus.pratama dibuat',
      before: null,
      after: { username: 'agus.pratama', roles: ['WORKER'] },
      created_at: ago(4),
    },
    {
      id: 1,
      action: 'LOGOUT',
      entity: 'auth',
      entity_id: null,
      actor_username: 'rina.admin',
      ip: '10.12.1.8',
      summary: 'Logout',
      before: null,
      after: null,
      created_at: ago(20),
    },
  ];

  return {
    users: users(),
    sites,
    vendors,
    items,
    pipelines,
    pipelineItems,
    inventories,
    policies,
    pipelineReports,
    inventoryReports,
    auditLogs,
  };
}

/** @typedef {ReturnType<typeof createSeed>} MockDb */
