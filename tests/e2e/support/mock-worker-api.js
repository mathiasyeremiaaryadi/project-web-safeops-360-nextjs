import { SLA_CATALOG, WORKER_SLA } from './mock-sla.js';

/*
 * In-browser mock of the BFF for the Worker E2E tests (see mock-api.js for the other roles).
 * Two workers of PT Bersih Jaya: Agus (the signed-in user, 5 tasks in the mockup's states) and
 * Sinta (only used to prove that another worker's report is not reachable).
 *
 * Endpoints marked "kontrak PRD 1.2 — belum ada di BRD" follow the prompt's target contract
 * (evidence upload, submit, history); the backend does not have them yet.
 */

export const WORKER_AGUS = {
  id: 'wk1',
  username: 'agus.pratama',
  full_name: 'Agus Pratama',
  roles: ['WORKER'],
  scopes: { vendors: [{ id: 'v1', name: 'PT Bersih Jaya' }] },
  must_change_password: false,
};

export const WORKER_SINTA = { ...WORKER_AGUS, id: 'wk2', username: 'sinta.maharani' };

/** A valid 1×1 PNG: the app compresses it to JPEG like a camera photo. */
export const PHOTO = {
  name: 'IMG_0001.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
};

/** Today in the app's timezone (Asia/Jakarta), like the app computes it. */
export const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
  new Date(),
);

const PIPELINE = {
  id: 'p1',
  name: 'Cleaning Turbine Hall Lt.1',
  vendor: { name: 'PT Bersih Jaya' },
};
const SHIFT = { name: 'Pagi', start_time: '07:00:00', end_time: '15:00:00' };
const ITEMS = [
  { id: 'pi1', sort_order: 1, name: 'Sapu & pel lantai' },
  { id: 'pi2', sort_order: 2, name: 'Lap panel & railing' },
  { id: 'pi3', sort_order: 3, name: 'Bersihkan tumpahan oli' },
  { id: 'pi4', sort_order: 4, name: 'Kosongkan kantong sampah' },
  { id: 'pi5', sort_order: 5, name: 'Periksa jalur evakuasi' },
];
const photoUrl = (/** @type {string} */ name) => `http://localhost/e2e-files/${name}.jpg?sig=test`;

function createWorkerData() {
  const at = (/** @type {string} */ time) => `${TODAY}T${time}:00+07:00`;
  /** @param {string} id @param {string} itemId @param {object} fields */
  const report = (id, itemId, fields) => {
    const item = ITEMS.find((i) => i.id === itemId);
    return {
      id,
      user_id: 'wk1',
      pipeline_item_id: itemId,
      item_name: item?.name,
      pipeline_name: PIPELINE.name,
      shift: 'Pagi',
      report_date: TODAY,
      revision_status: 'NONE',
      evidence_before_url: null,
      evidence_after_url: null,
      opened_at: null,
      closed_at: null,
      notes: null,
      note_category: null,
      ...fields,
    };
  };
  const done = {
    evidence_before_url: photoUrl('b'),
    evidence_after_url: photoUrl('a'),
    opened_at: at('07:20'),
    closed_at: at('07:50'),
  };
  return {
    reports: [
      report('r1', 'pi1', { status: 'COMPLETED', ...done }),
      report('r2', 'pi2', { status: 'SUBMITTED', ...done }),
      report('r3', 'pi3', {
        status: 'IN_PROGRESS',
        evidence_before_url: photoUrl('r3-before'),
        opened_at: at('08:10'),
      }),
      report('r4', 'pi4', {
        status: 'REJECTED',
        revision_status: 'REQUESTED',
        reason: 'Foto sesudah buram, ulangi dari sudut yang sama.',
        ...done,
      }),
      // Another worker's report: must stay unreachable for Agus.
      { ...report('r9', 'pi1', { status: 'IN_PROGRESS' }), user_id: 'wk2' },
    ],
    inventories: [
      { id: 'inv1', vendor_id: 'v1', item: 'Sapu ijuk', jenis_item: 'Alat kebersihan', qty: 6 },
      { id: 'inv2', vendor_id: 'v1', item: 'Mesin poles', jenis_item: 'Mesin', qty: 1 },
    ].map((row) => ({ ...row, status_condition: 'GOOD', is_active: true })),
    inventoryReports: [
      {
        id: 'ir1',
        vendor_id: 'v1',
        user_id: 'wk1',
        report_type: 'REQUEST',
        description: 'Sarung tangan habis',
        status: 'REJECTED',
        review_reason: 'Stok sudah dikirim kemarin.',
        created_at: at('06:55'),
      },
    ],
    policies: [
      { id: 'pol1', name: 'SOP Kebersihan Turbine Hall', vendor_id: 'v1', file_size: 245_760 },
      { id: 'pol2', name: 'SOP Penanganan Tumpahan Oli', vendor_id: 'v1', file_size: 512_000 },
    ].map((row) => ({ ...row, is_active: true, updated_at: at('06:00') })),
  };
}

/** Field names and text values of a multipart body (never file contents). */
function readBody(request) {
  const type = request.headers()['content-type'] ?? '';
  const raw = request.postData() ?? '';
  if (type.includes('application/json')) return raw ? JSON.parse(raw) : {};
  const fields = {};
  if (type.includes('multipart/form-data')) {
    for (const match of raw.matchAll(
      /name="([^"]+)"(?:; filename="([^"]+)")?\r\n(?:Content-Type: [^\r]+\r\n)?\r\n([^\r]*)/g,
    )) {
      fields[match[1]] = match[2] ? { file: match[2] } : match[3];
    }
  }
  return fields;
}

/**
 * Signs the page in as a Worker against the mock API.
 * @param {import('@playwright/test').Page} page
 * @param {{ user?: object, slaForbidden?: boolean }} [options] `slaForbidden`: the SLA score
 *   endpoint answers 403 (the "Skor SLA saya" card must disappear).
 */
export async function mockWorkerApi(page, { user = WORKER_AGUS, slaForbidden = false } = {}) {
  const data = createWorkerData();
  /** @type {{ method: string, path: string, body: any }[]} */
  const writes = [];
  let created = 0;
  // Playwright still routes requests while the context is offline: fail them like a real device.
  let offline = false;

  await page
    .context()
    .addCookies([
      { name: 'safeops_session', value: 'e2e', domain: 'localhost', path: '/', sameSite: 'Lax' },
    ]);

  await page.route('**/api/**', async (route) => {
    if (offline) return route.abort('internetdisconnected');
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname.replace(/^\/api\//, '');
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const error = (status, code) => json({ error: { code, message: code } }, status);

    if (path === 'auth/me') return json(user);
    if (path.startsWith('auth/')) return json({ message: 'ok' });

    const [resource, id, sub] = path.replace(/^v1\//, '').split('/');
    const body = method === 'GET' ? null : readBody(request);
    if (body) writes.push({ method, path: `/${path.replace(/^v1\//, '')}`, body });
    const own = data.reports.filter((r) => r.user_id === user.id);
    const report = own.find((r) => r.id === id);

    if (resource === 'me' && id === 'tasks') {
      if (url.searchParams.get('date') !== TODAY) return json({ data: [] });
      return json({
        data: ITEMS.map((item) => {
          const r = own.find((x) => x.pipeline_item_id === item.id);
          return {
            shift: SHIFT,
            pipeline_item: {
              id: item.id,
              sort_order: item.sort_order,
              item: { name: item.name },
              pipeline: PIPELINE,
            },
            report: r
              ? { id: r.id, status: r.status, revision_status: r.revision_status, reason: r.reason }
              : null,
          };
        }),
      });
    }

    if (resource === 'pipeline-reports') {
      if (!id && method === 'POST') {
        if (own.some((r) => r.pipeline_item_id === body.pipeline_item_id)) {
          return error(409, 'CONFLICT');
        }
        created += 1;
        const item = ITEMS.find((i) => i.id === body.pipeline_item_id);
        const row = {
          ...data.reports[0],
          id: `r-new-${created}`,
          pipeline_item_id: item?.id,
          item_name: item?.name,
          status: 'IN_PROGRESS',
          revision_status: 'NONE',
          evidence_before_url: null,
          evidence_after_url: null,
          opened_at: null,
          closed_at: null,
          notes: null,
          note_category: null,
          report_date: body.report_date,
        };
        data.reports.push(row);
        return json({ data: { id: row.id } }, 201);
      }
      if (!id) {
        let list = own;
        for (const field of ['status', 'revision_status']) {
          const value = url.searchParams.get(field);
          if (value) list = list.filter((r) => r[field] === value);
        }
        return json({ pipeline_reports: list, page: 1, limit: 20, total: list.length });
      }
      // Another worker's report is "not found" for this worker.
      if (!report) return error(404, 'NOT_FOUND');
      // kontrak PRD 1.2 — belum ada di BRD: no history endpoint, so the page hides it.
      if (sub === 'history') return error(404, 'NOT_FOUND');
      if (method === 'GET') return json({ data: report });
      if (report.status === 'COMPLETED') return error(403, 'FORBIDDEN');
      if (sub === 'evidence') {
        // kontrak PRD 1.2 — belum ada di BRD
        const now = new Date().toISOString();
        if (body.type === 'before') {
          report.evidence_before_url = photoUrl(`${id}-before`);
          report.opened_at = now;
        } else {
          report.evidence_after_url = photoUrl(`${id}-after`);
          report.closed_at = now;
        }
        return json({ data: report });
      }
      if (sub === 'submit') {
        // kontrak PRD 1.2 — belum ada di BRD
        if (!report.evidence_before_url || !report.evidence_after_url) {
          return error(422, 'EVIDENCE_REQUIRED');
        }
        const revision = report.revision_status === 'REQUESTED';
        Object.assign(report, {
          status: 'SUBMITTED',
          revision_status: revision ? 'RESUBMITTED' : report.revision_status,
        });
        return json({ data: report });
      }
      if (method === 'PATCH') {
        Object.assign(report, { notes: body.notes, note_category: body.note_category });
        return json({ data: report });
      }
    }

    if (resource === 'inventory-reports') {
      if (method === 'POST') {
        const inventory = data.inventories.find((i) => i.id === body.inventory_id);
        data.inventoryReports.unshift({
          id: `ir-new-${data.inventoryReports.length}`,
          vendor_id: body.vendor_id,
          user_id: user.id,
          report_type: body.report_type,
          inventory_id: body.inventory_id,
          inventory_item: inventory?.item,
          description: body.description,
          status: 'SUBMITTED',
          created_at: new Date().toISOString(),
        });
        return json({ message: 'ok' }, 201);
      }
      const list = data.inventoryReports.filter((r) => r.user_id === user.id);
      return json({ inventory_reports: list, page: 1, limit: 20, total: list.length });
    }
    if (resource === 'sla-catalog') return json({ data: SLA_CATALOG });
    if (resource === 'sla-scores' && id === 'live') {
      return slaForbidden ? error(403, 'FORBIDDEN') : json({ data: [WORKER_SLA] });
    }
    if (resource === 'inventories') return json({ inventories: data.inventories });
    if (resource === 'policies' && sub === 'file') {
      return json({ data: { url: `http://localhost/e2e-files/${id}.pdf?sig=test` } });
    }
    if (resource === 'policies') return json({ policies: data.policies });
    if (resource === 'sites') return json({ sites: [{ id: 's1', name: 'PLTU Paiton' }] });
    if (resource === 'vendors') return json({ vendors: [{ id: 'v1', name: 'PT Bersih Jaya' }] });

    // Everything else is for other roles.
    return error(403, 'FORBIDDEN');
  });

  /** Takes the device off/on the network (`context.setOffline` + failing API calls). */
  const setOffline = async (/** @type {boolean} */ value) => {
    offline = value;
    await page.context().setOffline(value);
  };

  return { data, writes, setOffline };
}
