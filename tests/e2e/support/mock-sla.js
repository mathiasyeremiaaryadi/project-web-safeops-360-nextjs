/*
 * In-browser mock of the SLA & maturity endpoints (Postman "SLA & Maturity", no response
 * examples: shapes follow the SLA prompt section 4). Registered AFTER mockApi(), so these routes
 * win for `/sla-*` and `/maturity-*`. Data follows the mockups (PLTU Paiton, Oktober 2026).
 */

export const SLA_CATALOG = [
  ['COMPLETION_RATE', 'PERCENT', 'UP', true],
  ['ON_TIME_RATE', 'PERCENT', 'UP', true],
  ['AVG_LATE_MINUTES', 'MINUTES', 'DOWN', true],
  ['LATE_UPLOAD_RATE', 'PERCENT', 'DOWN', true],
  ['EVIDENCE_COMPLETE_RATE', 'PERCENT', 'UP', true],
  ['K3_FINDING_NOTES_RATE', 'PERCENT', 'UP', true],
  ['CONSISTENCY', 'SCORE', 'UP', false],
].map(([code, unit, direction, sla]) => ({ code, unit, direction, sla, maturity: true }));

const DEFAULT_LEVELS = [
  { level: 2, min_score: 60, min_dimension: 50, consecutive_periods: 1 },
  { level: 3, min_score: 75, min_dimension: 65, consecutive_periods: 2 },
  { level: 4, min_score: 85, min_dimension: 75, consecutive_periods: 3 },
  { level: 5, min_score: 95, min_dimension: 85, consecutive_periods: 3 },
];

const BJ_V3 = [
  { code: 'COMPLETION_RATE', weight: 30, target: 95 },
  { code: 'ON_TIME_RATE', weight: 30, target: 90 },
  { code: 'AVG_LATE_MINUTES', weight: 10, target: 15 },
  { code: 'LATE_UPLOAD_RATE', weight: 10, target: 10 },
  { code: 'EVIDENCE_COMPLETE_RATE', weight: 15, target: 98 },
  { code: 'K3_FINDING_NOTES_RATE', weight: 5, target: 90 },
];

/** @param {object} fields */
const rule = (fields) => ({
  site_id: null,
  period_type: 'MONTH',
  created_at: '2026-09-01T02:00:00Z',
  created_by_name: 'Hendra Wijaya',
  superseded_at: null,
  indicators: [],
  dimensions: [],
  levels: [],
  ...fields,
});

function createSlaData() {
  const slaRules = [
    rule({
      id: 'sla-bj-1',
      vendor_id: 'v1',
      vendor_name: 'PT Bersih Jaya',
      version: 1,
      created_at: '2026-01-05T02:00:00Z',
      superseded_at: '2026-04-01T02:00:00Z',
      indicators: BJ_V3.slice(0, 2).map((i) => ({ ...i, weight: 50 })),
    }),
    rule({
      id: 'sla-bj-2',
      vendor_id: 'v1',
      vendor_name: 'PT Bersih Jaya',
      version: 2,
      created_at: '2026-04-01T02:00:00Z',
      superseded_at: '2026-09-01T02:00:00Z',
      indicators: BJ_V3.map((i) => (i.code === 'LATE_UPLOAD_RATE' ? { ...i, target: 15 } : i)),
    }),
    rule({
      id: 'sla-bj-3',
      vendor_id: 'v1',
      vendor_name: 'PT Bersih Jaya',
      version: 3,
      indicators: BJ_V3,
    }),
    rule({
      id: 'sla-bj-pct',
      vendor_id: 'v1',
      vendor_name: 'PT Bersih Jaya',
      site_id: 's4',
      site_name: 'PLTU Pacitan',
      version: 1,
      indicators: BJ_V3,
    }),
    rule({
      id: 'sla-ka-2',
      vendor_id: 'v2',
      vendor_name: 'PT Karya Aman',
      version: 2,
      indicators: BJ_V3,
    }),
    rule({
      id: 'sla-ka-ptn',
      vendor_id: 'v2',
      vendor_name: 'PT Karya Aman',
      site_id: 's1',
      site_name: 'PLTU Paiton',
      version: 4,
      period_type: 'WEEK',
      created_by_name: 'Budi Santoso',
      indicators: BJ_V3,
    }),
    rule({
      id: 'sla-sp-1',
      vendor_id: 'v5',
      vendor_name: 'PT Sinar Prima Servis',
      version: 1,
      period_type: 'QUARTER',
      indicators: BJ_V3,
    }),
  ];
  const maturityRules = [
    rule({
      id: 'mat-bj-1',
      vendor_id: 'v1',
      vendor_name: 'PT Bersih Jaya',
      version: 1,
      dimensions: [
        { code: 'COMPLETION_RATE', weight: 30 },
        { code: 'ON_TIME_RATE', weight: 30 },
        { code: 'EVIDENCE_COMPLETE_RATE', weight: 15 },
        { code: 'LATE_UPLOAD_RATE', weight: 10 },
        { code: 'CONSISTENCY', weight: 15 },
      ],
      levels: DEFAULT_LEVELS,
    }),
  ];
  return { slaRules, maturityRules, created: [] };
}

/** One SLA item. */
const item = (code, actual, target, met, extra = {}) => ({
  indicator_code: code,
  actual,
  target,
  score: met ? 100 : 80,
  met,
  weight: BJ_V3.find((i) => i.code === code)?.weight ?? 10,
  is_na: false,
  ...extra,
});

/** Five counted indicators (+ K3 N/A); `missed` = codes not met. */
const items = (missed = []) => [
  item('COMPLETION_RATE', 97.5, 95, !missed.includes('COMPLETION_RATE')),
  item(
    'ON_TIME_RATE',
    missed.includes('ON_TIME_RATE') ? 86 : 93,
    90,
    !missed.includes('ON_TIME_RATE'),
  ),
  item('AVG_LATE_MINUTES', 9, 15, !missed.includes('AVG_LATE_MINUTES')),
  item(
    'LATE_UPLOAD_RATE',
    missed.includes('LATE_UPLOAD_RATE') ? 14 : 6,
    10,
    !missed.includes('LATE_UPLOAD_RATE'),
  ),
  item('EVIDENCE_COMPLETE_RATE', 99, 98, !missed.includes('EVIDENCE_COMPLETE_RATE')),
  item('K3_FINDING_NOTES_RATE', null, 90, null, { is_na: true, score: null }),
];

const dims = (score) =>
  [
    'COMPLETION_RATE',
    'ON_TIME_RATE',
    'EVIDENCE_COMPLETE_RATE',
    'LATE_UPLOAD_RATE',
    'CONSISTENCY',
  ].map((code, i) => ({
    dimension_code: code,
    actual: score - i,
    score: score - i,
    weight: 20,
    is_na: false,
  }));

const MONTH = { period_type: 'MONTH', period_start: '2026-10-01', period_end: '2026-10-31' };

/** Live vendors at PLTU Paiton (mockup 24). */
function liveRows(scope, siteId) {
  const site = scope === 'VENDOR' ? {} : { site_id: siteId ?? 's1', site_name: 'PLTU Paiton' };
  const base = (vendor_id, vendor_name) => ({
    scope_type: scope,
    vendor_id,
    vendor_name,
    ...site,
    ...MONTH,
    live: true,
    task_count: 120,
    rule_version: 3,
    rule_id: 'sla-bj-3',
  });
  return [
    { ...base('v1', 'PT Bersih Jaya'), status: 'OK', score: 98.1, compliant: true, items: items() },
    {
      ...base('v5', 'PT Sinar Prima Servis'),
      status: 'OK',
      score: 93.4,
      compliant: false,
      items: items(['ON_TIME_RATE']),
    },
    {
      ...base('v2', 'PT Karya Aman'),
      status: 'OK',
      score: 88.7,
      compliant: false,
      items: items(['ON_TIME_RATE', 'LATE_UPLOAD_RATE']),
    },
    {
      ...base('v6', 'PT Cahaya Facility'),
      status: 'NO_RULE',
      score: null,
      compliant: null,
      items: [],
    },
    {
      ...base('v7', 'CV Mitra Higienis'),
      status: 'NO_DATA',
      score: null,
      compliant: null,
      items: [],
      task_count: 0,
    },
  ];
}

const LIVE_LEVELS = { v1: [4, 91.2], v5: [3, 82.5], v2: [2, 70.4] };

/** Frozen history of PT Bersih Jaya (May–Sep) and Karya Aman (Sep, Level 3). */
function historyRows(scope, siteId) {
  const site = scope === 'VENDOR' ? {} : { site_id: siteId ?? 's1', site_name: 'PLTU Paiton' };
  const months = [
    ['2026-05-01', 96.2, true, 3],
    ['2026-06-01', 97.0, true, 3],
    ['2026-07-01', 92.4, false, 3],
    ['2026-08-01', 97.8, true, 3],
    ['2026-09-01', 95.6, false, 4],
  ];
  const bj = months.map(([start, score, compliant, level]) => ({
    sla: {
      scope_type: scope,
      vendor_id: 'v1',
      vendor_name: 'PT Bersih Jaya',
      ...site,
      period_type: 'MONTH',
      // Like the backend: a timestamp, not a date.
      period_start: `${start}T00:00:00+07:00`,
      status: 'OK',
      score,
      compliant,
      live: false,
      task_count: 412,
      rule_version: 3,
      items: compliant ? items() : items(['ON_TIME_RATE', 'LATE_UPLOAD_RATE']),
    },
    level,
  }));
  const ka = {
    sla: {
      scope_type: scope,
      vendor_id: 'v2',
      vendor_name: 'PT Karya Aman',
      ...site,
      period_type: 'MONTH',
      period_start: '2026-09-01',
      status: 'OK',
      score: 91,
      compliant: true,
      live: false,
      items: items(),
    },
    level: 3,
  };
  return [...bj, ka];
}

/** @param {any[]} rows @param {URL} url */
function inRange(rows, url) {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const day = (/** @type {string} */ value) => value.slice(0, 10);
  return rows.filter(
    (r) => (!from || day(r.period_start) >= from) && (!to || day(r.period_start) <= to),
  );
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ role: 'SUPER_ADMIN' | 'ADMIN' | 'ADMIN_WORKER', siteIds?: string[], vendorId?: string }} options
 */
export async function mockSla(page, { role, siteIds = [], vendorId }) {
  const data = createSlaData();
  /** @type {{ method: string, path: string, body: any }[]} */
  const writes = [];

  await page.route(/\/api\/v1\/(sla-|maturity-)/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname.replace(/^\/api\/v1\//, '');
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const error = (status, message) => json({ error: { code: 'ERR', message } }, status);
    const [resource, id] = path.split('/');
    const body = method === 'GET' ? null : JSON.parse(request.postData() || '{}');
    if (body !== null) writes.push({ method, path: `/${path}`, body });

    if (resource === 'sla-catalog') return json({ data: SLA_CATALOG });
    if (resource === 'maturity-catalog') {
      return json({ data: { dimensions: SLA_CATALOG, levels: DEFAULT_LEVELS } });
    }

    if (resource === 'sla-rules' || resource === 'maturity-rules') {
      if (role === 'ADMIN_WORKER') return error(403, 'forbidden');
      const list = resource === 'sla-rules' ? data.slaRules : data.maturityRules;
      const visible = (r) => role !== 'ADMIN' || !r.site_id || siteIds.includes(r.site_id);
      if (id === 'history') {
        const vendor = url.searchParams.get('vendor_id');
        const siteId = url.searchParams.get('site_id');
        return json({
          data: list.filter(
            (r) => r.vendor_id === vendor && (r.site_id ?? '') === (siteId ?? '') && visible(r),
          ),
        });
      }
      if (id) {
        const found = list.find((r) => r.id === id && visible(r));
        if (!found) return error(404, 'not found');
        if (method === 'DELETE') {
          found.superseded_at = new Date().toISOString();
          found.deleted = true;
          return json({ message: 'ok' });
        }
        return json({ data: found });
      }
      if (method === 'POST') {
        if (role === 'ADMIN' && (!body.site_id || !siteIds.includes(body.site_id))) {
          return error(403, 'forbidden');
        }
        const parts = body.indicators ?? body.dimensions ?? [];
        const total = parts.reduce((sum, p) => sum + p.weight, 0);
        if (Math.abs(total - 100) > 0.01) return error(400, 'Total bobot harus 100.');
        const levels = body.levels ?? [];
        const rising = levels.every(
          (l, i) =>
            i === 0 ||
            (l.min_score >= levels[i - 1].min_score &&
              l.min_dimension >= levels[i - 1].min_dimension),
        );
        if (!rising) return error(400, 'Syarat level harus naik bertahap.');
        const same = list.filter(
          (r) => r.vendor_id === body.vendor_id && (r.site_id ?? null) === (body.site_id ?? null),
        );
        const active = same.find((r) => !r.superseded_at);
        if (active) active.superseded_at = new Date().toISOString();
        const created = rule({
          ...body,
          id: `${resource}-new-${list.length}`,
          vendor_name: body.vendor_id === 'v6' ? 'PT Cahaya Facility' : undefined,
          version: Math.max(0, ...same.map((r) => r.version)) + 1,
          created_at: new Date().toISOString(),
          created_by_name: role === 'ADMIN' ? 'Budi Santoso' : 'Hendra Wijaya',
          levels: body.levels ?? DEFAULT_LEVELS,
        });
        list.push(created);
        data.created.push(created);
        return json({ data: created }, 201);
      }
      const vendor = url.searchParams.get('vendor_id');
      const active = list.filter(
        (r) => !r.superseded_at && !r.deleted && visible(r) && (!vendor || r.vendor_id === vendor),
      );
      return json({ data: active });
    }

    // Scores and levels. Like the backend, `from` / `to` must be dates.
    for (const field of ['from', 'to']) {
      const value = url.searchParams.get(field);
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return json(
          { error: { code: 'INVALID_OPERATIONAL_DATA', message: `${field} must be YYYY-MM-DD` } },
          400,
        );
      }
    }
    const scope = url.searchParams.get('scope') ?? 'VENDOR';
    const siteId = url.searchParams.get('site_id') ?? undefined;
    const ownVendor = (r) => !vendorId || r.vendor_id === vendorId;
    const ruleCreated = (vendor) => data.created.some((r) => r.vendor_id === vendor && !r.site_id);
    if (resource === 'sla-scores' && id === 'live') {
      return json({
        data: liveRows(scope, siteId)
          .filter(ownVendor)
          .map((r) =>
            r.status === 'NO_RULE' && ruleCreated(r.vendor_id)
              ? { ...r, status: 'OK', score: 90.5, compliant: true, items: items() }
              : r,
          ),
      });
    }
    if (resource === 'maturity-levels' && id === 'live') {
      return json({
        data: liveRows(scope, siteId)
          .filter(ownVendor)
          .map((r) => {
            const level = LIVE_LEVELS[r.vendor_id];
            return level
              ? {
                  ...r,
                  status: 'OK',
                  level: level[0],
                  score: level[1],
                  rule_id: 'mat-bj-1',
                  dimensions: dims(level[1]),
                  items: [],
                }
              : { ...r, items: [], dimensions: [] };
          }),
      });
    }
    const history = inRange(
      historyRows(scope, siteId).map((h) => h.sla),
      url,
    ).filter(ownVendor);
    if (resource === 'sla-scores')
      return json({ data: history, page: 1, limit: 100, total: history.length });
    if (resource === 'maturity-levels') {
      const levels = inRange(
        historyRows(scope, siteId).map((h) => ({
          ...h.sla,
          level: h.level,
          score: 80 + h.level,
          rule_id: 'mat-bj-1',
          dimensions: dims(80 + h.level),
          items: [],
        })),
        url,
      ).filter(ownVendor);
      return json({ data: levels, page: 1, limit: 100, total: levels.length });
    }
    return error(404, 'not mocked');
  });

  return { data, writes };
}

/** The Worker's own live SLA score (agus.pratama, 96,4, 4 of 5). */
export const WORKER_SLA = {
  scope_type: 'WORKER',
  vendor_id: 'v1',
  site_id: 's1',
  site_name: 'PLTU Paiton',
  worker_id: 'wk1',
  ...MONTH,
  status: 'OK',
  score: 96.4,
  compliant: false,
  live: true,
  items: items(['ON_TIME_RATE']),
};
