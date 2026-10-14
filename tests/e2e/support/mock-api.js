import { createFixtures, SUPER_ADMIN } from './fixtures.js';

/*
 * In-browser mock of the BFF (`/api/**`) for E2E tests of signed-in pages. Requests never leave
 * the browser, so the tests do not need a Go backend, credentials or real data.
 *
 * - The proxy only checks that a session cookie EXISTS before rendering a page, so a dummy cookie
 *   is set; `/api/auth/me` (mocked) then returns the signed-in user.
 * - GET returns fixture data in the envelopes the real backend uses.
 * - Writes are recorded in `api.writes` (method, path, JSON body or multipart field names) and
 *   the simple ones (status changes, reviews) are applied so the UI shows the result.
 */

/** List key per resource, as the Go backend wraps lists (`{ sites: [...] }`). */
const RESOURCES = {
  sites: 'sites',
  vendors: 'vendors',
  items: 'items',
  users: 'users',
  pipelines: 'pipelines',
  inventories: 'inventories',
  policies: 'policies',
  'pipeline-reports': 'pipelineReports',
  'inventory-reports': 'inventoryReports',
  'audit-logs': 'auditLogs',
};

/** Exact-match filters applied to lists (others are ignored, like a lenient backend). */
const FILTER_FIELDS = ['status', 'revision_status', 'report_type', 'status_condition', 'vendor_id'];

/** @param {import('@playwright/test').Request} request */
function readBody(request) {
  const type = request.headers()['content-type'] ?? '';
  const raw = request.postData() ?? '';
  if (type.includes('application/json')) return raw ? JSON.parse(raw) : {};
  if (type.includes('multipart/form-data')) {
    // Field names only (and text values), never file contents.
    const fields = {};
    for (const match of raw.matchAll(
      /name="([^"]+)"(?:; filename="([^"]+)")?\r\n(?:Content-Type: [^\r]+\r\n)?\r\n([^\r]*)/g,
    )) {
      fields[match[1]] = match[2] ? { file: match[2] } : match[3];
    }
    return fields;
  }
  return raw;
}

/**
 * Signs the page in against the mock API.
 * @param {import('@playwright/test').Page} page
 * @param {{ user?: object }} [options]
 */
export async function mockApi(page, { user = SUPER_ADMIN } = {}) {
  const data = createFixtures();
  /** @type {{ method: string, path: string, body: any }[]} */
  const writes = [];

  await page
    .context()
    .addCookies([
      { name: 'safeops_session', value: 'e2e', domain: 'localhost', path: '/', sameSite: 'Lax' },
    ]);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname.replace(/^\/api\//, '');
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === 'auth/me') return json(user);
    if (path.startsWith('auth/')) return json({ message: 'ok' });

    const segments = path.replace(/^v1\//, '').split('/');
    const [resource, id, sub] = segments;

    if (method !== 'GET') {
      const body = readBody(request);
      writes.push({ method, path: `/${segments.join('/')}`, body });
      return json(applyWrite(data, { method, resource, id, sub, body }));
    }

    if (resource === 'dashboard') return json(data.dashboard);
    if (resource === 'reports' && id === 'daily') return json(data.daily);
    if (resource === 'pipelines' && sub === 'items')
      return json({ pipeline_items: data.pipelineItems });
    if (resource === 'policies' && sub === 'file') {
      return json({ data: { url: `http://localhost/e2e-files/${id}.pdf?sig=test` } });
    }

    const key = RESOURCES[resource];
    if (!key) return json({ error: { code: 'NOT_FOUND', message: 'not mocked' } }, 404);
    const rows = data[key];
    if (id) {
      const row = rows.find((r) => String(r.id) === id);
      return row ? json({ data: row }) : json({ error: { code: 'NOT_FOUND' } }, 404);
    }
    let list = rows;
    for (const field of FILTER_FIELDS) {
      const value = url.searchParams.get(field);
      if (value) list = list.filter((r) => String(r[field] ?? '') === value);
    }
    return json({ [resource.replace('-', '_')]: list, page: 1, limit: 20, total: list.length });
  });

  return { data, writes };
}

/** Applies the writes the UI relies on to show a result; returns the response body. */
function applyWrite(data, { method, resource, id, sub, body }) {
  const key = RESOURCES[resource];
  const rows = key ? data[key] : [];
  const row = rows.find((r) => String(r.id) === id);

  if (resource === 'users' && method === 'POST' && !id) {
    const user = { id: 'u-new', is_active: true, ...body };
    data.users.push(user);
    return { user, temporary_password: 'Tmp-Passw0rd' };
  }
  if (resource === 'users' && sub === 'reset-password')
    return { temporary_password: 'Reset-Passw0rd' };
  if (resource === 'inventory-reports' && sub === 'review' && row) {
    Object.assign(
      row,
      { status: body.status },
      body.review_reason ? { review_reason: body.review_reason } : {},
    );
  } else if (row && method === 'PATCH' && body && typeof body === 'object') {
    for (const field of ['status', 'revision_status', 'reason', 'name', 'item', 'is_active']) {
      if (body[field] !== undefined) row[field] = body[field];
    }
  } else if (row && method === 'DELETE') {
    if ('is_active' in row) row.is_active = false;
    else row.status = 'INACTIVE';
  }
  return { message: 'ok' };
}
