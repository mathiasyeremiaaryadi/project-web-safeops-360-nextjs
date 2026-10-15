import {
  formatScore,
  LEVEL_NAMES,
  MAX_PERCENT,
  PERIOD_TYPES,
  RESULT_STATUS,
} from '@/features/sla-shared';

export { formatIndicatorValue, formatScore, formatTarget } from '@/features/sla-shared';

/*
 * Display helpers for SLA & maturity results. Nothing here computes a score, compliance, N/A or
 * a level: those always come from the backend. These functions only merge, label and format.
 */

/** @typedef {import('@/features/sla-results/api/schemas').Result} Result */

/**
 * @typedef {object} MergedResult
 * @property {string} key
 * @property {string | null} scope_type
 * @property {string | null} vendor_id
 * @property {string | null} vendor_name
 * @property {string | null} site_id
 * @property {string | null} site_name
 * @property {string | null} worker_id
 * @property {string | null} worker_name
 * @property {string | null} period_type
 * @property {string | null} period_start
 * @property {string | null} period_end
 * @property {boolean} live
 * @property {Result | null} sla
 * @property {Result | null} maturity
 */

/** Same entity and period. @param {Result} r */
export const resultKey = (r) =>
  [r.scope_type, r.vendor_id, r.site_id, r.worker_id, r.period_start].map((v) => v ?? '').join('|');

/** Same entity, any period. @param {Result} r */
const entityOnlyKey = (r) =>
  [r.scope_type, r.vendor_id, r.site_id, r.worker_id].map((v) => v ?? '').join('|');

/**
 * Joins SLA and maturity rows of the same entity and period
 * (`scope_type + vendor_id + site_id + worker_id + period_start`). Order: SLA rows first.
 * The row's own period fields come from the SLA row when there is one.
 * @param {Result[]} slaRows
 * @param {Result[]} maturityRows
 * @param {(row: Result) => string} [keyOf]
 * @returns {MergedResult[]}
 */
export function mergeResults(slaRows, maturityRows, keyOf = resultKey) {
  /** @type {Map<string, MergedResult>} */
  const merged = new Map();
  /** @param {Result} row @param {'sla' | 'maturity'} kind */
  const add = (row, kind) => {
    const key = keyOf(row);
    const current = merged.get(key);
    merged.set(key, {
      key,
      scope_type: current?.scope_type ?? row.scope_type ?? null,
      vendor_id: current?.vendor_id ?? row.vendor_id,
      vendor_name: current?.vendor_name ?? row.vendor_name ?? null,
      site_id: current?.site_id ?? row.site_id,
      site_name: current?.site_name ?? row.site_name ?? null,
      worker_id: current?.worker_id ?? row.worker_id,
      worker_name: current?.worker_name ?? row.worker_name ?? null,
      period_type: current?.period_type ?? row.period_type ?? null,
      period_start: current?.period_start ?? row.period_start ?? null,
      period_end: current?.period_end ?? row.period_end ?? null,
      live: Boolean(current?.live || row.live),
      sla: kind === 'sla' ? row : (current?.sla ?? null),
      maturity: kind === 'maturity' ? row : (current?.maturity ?? null),
    });
  };
  slaRows.forEach((row) => add(row, 'sla'));
  maturityRows.forEach((row) => add(row, 'maturity'));
  return [...merged.values()];
}

/**
 * Live (running) periods: one row per entity. SLA and maturity rules may use different period
 * types (e.g. a quarterly SLA override and a weekly maturity default), so their running periods
 * start on different dates; each keeps its own period in `row.sla` / `row.maturity`.
 * @param {Result[]} slaRows
 * @param {Result[]} maturityRows
 * @returns {MergedResult[]}
 */
export const mergeLiveResults = (slaRows, maturityRows) =>
  mergeResults(slaRows, maturityRows, entityOnlyKey);

/** `YYYY-MM-DD` → UTC date (period dates are calendar dates). @param {string} iso */
const toUtcDate = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** @param {Date} date */
const toIso = (date) => date.toISOString().slice(0, 10);

const MONTH_YEAR = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const DAY_MONTH = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Days in a week period. */
const WEEK_DAYS = 7;
const MONTHS_PER_QUARTER = 3;

/**
 * "Oktober 2026", "Kuartal 4 2026", "12–18 Okt 2026". Calendar periods; dates are the backend's.
 * @param {string | null | undefined} periodType
 * @param {string | null | undefined} periodStart `YYYY-MM-DD`
 */
export function formatPeriod(periodType, periodStart) {
  if (!periodStart) return '—';
  const start = toUtcDate(periodStart);
  if (periodType === PERIOD_TYPES.QUARTER) {
    const quarter = Math.floor(start.getUTCMonth() / MONTHS_PER_QUARTER) + 1;
    return `Kuartal ${quarter} ${start.getUTCFullYear()}`;
  }
  if (periodType === PERIOD_TYPES.WEEK) {
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + WEEK_DAYS - 1);
    return `${DAY_MONTH.format(start)} – ${DAY_MONTH_YEAR.format(end)}`;
  }
  return MONTH_YEAR.format(start);
}

/**
 * Start date of the period `count` periods before `periodStart` (calendar arithmetic only).
 * @param {string | null | undefined} periodType
 * @param {string} periodStart
 * @param {number} [count]
 */
export function periodStartBefore(periodType, periodStart, count = 1) {
  const date = toUtcDate(periodStart);
  if (periodType === PERIOD_TYPES.WEEK) {
    date.setUTCDate(date.getUTCDate() - WEEK_DAYS * count);
  } else {
    const months = periodType === PERIOD_TYPES.QUARTER ? MONTHS_PER_QUARTER : 1;
    date.setUTCMonth(date.getUTCMonth() - months * count);
  }
  return toIso(date);
}

/** "Level 4 · Terukur" @param {number | null | undefined} level */
export const levelText = (level) =>
  level
    ? `Level ${level} · ${LEVEL_NAMES[/** @type {keyof typeof LEVEL_NAMES} */ (level)] ?? ''}`
    : '—';

/**
 * Indicators met / counted (non-N/A), as sent by the backend.
 * @param {Result} result
 */
export function metCount(result) {
  const counted = result.items.filter((item) => !item.is_na);
  return { met: counted.filter((item) => item.met).length, counted: counted.length };
}

/**
 * @typedef {object} ResultDisplay
 * @property {'OK' | 'NO_DATA' | 'NO_RULE' | 'MISSING'} state
 * @property {boolean} showScore A score (and bar / level) may be shown.
 * @property {{ label: string, variant: 'success' | 'warning' | 'neutral' }} badge
 * @property {string | null} message Text under the badge.
 * @property {'success' | 'warning' | null} tone Colour of the score bar.
 * @property {boolean} offerRule Invite to create a rule (if the user may).
 * @property {boolean} live Provisional (current period).
 */

/** Badges per state, for SLA and for maturity. */
const NO_RULE_LABEL = { sla: 'Belum ada aturan SLA', maturity: 'Belum ada aturan maturity' };

/**
 * The ONE place that decides what a result shows: OK (score), NO_DATA ("Tidak ada data", never
 * 0), NO_RULE ("Belum ada aturan", with the invite), or nothing. Components never check `status`.
 * @param {Result | null | undefined} result
 * @param {'sla' | 'maturity'} [kind]
 * @returns {ResultDisplay}
 */
export function getResultDisplay(result, kind = 'sla') {
  const live = Boolean(result?.live);
  if (!result) {
    return {
      state: 'MISSING',
      showScore: false,
      badge: { label: '—', variant: 'neutral' },
      message: null,
      tone: null,
      offerRule: false,
      live,
    };
  }
  if (result.status === RESULT_STATUS.NO_RULE) {
    return {
      state: 'NO_RULE',
      showScore: false,
      badge: { label: NO_RULE_LABEL[kind], variant: 'neutral' },
      message: 'Skor belum bisa dihitung.',
      tone: null,
      offerRule: true,
      live,
    };
  }
  if (result.status === RESULT_STATUS.NO_DATA || result.score === null) {
    return {
      state: 'NO_DATA',
      showScore: false,
      badge: { label: 'Tidak ada data', variant: 'neutral' },
      message: 'Tidak ada task di periode ini.',
      tone: null,
      offerRule: false,
      live,
    };
  }
  const compliant = Boolean(result.compliant);
  if (kind === 'maturity') {
    return {
      state: 'OK',
      showScore: true,
      badge: { label: levelText(result.level), variant: 'success' },
      message: null,
      tone: null,
      offerRule: false,
      live,
    };
  }
  const { met, counted } = metCount(result);
  return {
    state: 'OK',
    showScore: true,
    badge: compliant
      ? { label: 'Tercapai', variant: 'success' }
      : { label: 'Tidak tercapai', variant: 'warning' },
    message: `${met} dari ${counted} indikator tercapai`,
    tone: compliant ? 'success' : 'warning',
    offerRule: false,
    live,
  };
}

/**
 * KPI cards of the dashboard, from the rows the backend returned (display aggregation only:
 * an average and counts of `OK` rows — no score is computed).
 * @param {MergedResult[]} rows
 */
export function summarizeResults(rows) {
  const scored = rows.filter(
    (row) => row.sla?.status === RESULT_STATUS.OK && row.sla.score !== null,
  );
  const levels = rows
    .filter((row) => row.maturity?.status === RESULT_STATUS.OK && row.maturity.level)
    .map((row) => /** @type {number} */ (row.maturity?.level));
  /** @type {Record<number, number>} */
  const levelCounts = {};
  for (const level of levels) levelCounts[level] = (levelCounts[level] ?? 0) + 1;
  const total = scored.reduce((sum, row) => sum + /** @type {number} */ (row.sla?.score), 0);
  return {
    okCount: scored.length,
    averageScore: scored.length ? total / scored.length : null,
    compliantCount: scored.filter((row) => row.sla?.compliant).length,
    highestLevel: levels.length ? Math.max(...levels) : null,
    noRule: rows.filter((row) => row.sla?.status === RESULT_STATUS.NO_RULE).length,
    noData: rows.filter((row) => row.sla?.status === RESULT_STATUS.NO_DATA).length,
    levelCounts,
  };
}

/**
 * Period-start range covering the period before each row (rows may use different period
 * types), for ONE history request.
 * @param {MergedResult[]} rows
 * @returns {{ from: string, to: string } | null}
 */
export function previousPeriodRange(rows) {
  // SLA and maturity of a live row may use different periods: cover the previous one of each.
  const starts = rows
    .flatMap((row) => [row.sla ?? row, row.maturity ?? row])
    .filter((period) => period.period_start)
    .map((period) =>
      periodStartBefore(period.period_type, /** @type {string} */ (period.period_start)),
    )
    .sort();
  return starts.length ? { from: starts[0], to: starts[starts.length - 1] } : null;
}

/** Smallest visible bar, so the lowest score of the range is still a bar. */
const MIN_BAR_PERCENT = 15;
/** Step of the automatic Y baseline (scores cluster near 100: a 0 baseline hides differences). */
const BASELINE_STEP = 5;

/**
 * Bars of the score chart: height from an automatic baseline (not 0), the score label, and the
 * colour — compliant, not compliant, or provisional (live). Periods without a score have no bar.
 * @param {MergedResult[]} periods Oldest first.
 */
export function scoreChartBars(periods) {
  const scores = periods
    .filter((row) => getResultDisplay(row.sla).showScore)
    .map((row) => /** @type {number} */ (row.sla?.score));
  const max = scores.length ? Math.max(...scores) : 0;
  const baseline = scores.length
    ? Math.max(0, Math.floor(Math.min(...scores) / BASELINE_STEP) * BASELINE_STEP - BASELINE_STEP)
    : 0;
  return periods.map((row) => {
    const display = getResultDisplay(row.sla);
    if (!display.showScore) return { key: row.key, heightPercent: 0, label: '—', tone: null };
    const score = /** @type {number} */ (row.sla?.score);
    const share = max > baseline ? (score - baseline) / (max - baseline) : 1;
    return {
      key: row.key,
      heightPercent: MIN_BAR_PERCENT + share * (MAX_PERCENT - MIN_BAR_PERCENT),
      label: formatScore(score),
      tone: row.live ? 'live' : display.tone,
    };
  });
}

/**
 * "Naik ke Level 4 pada September 2026." — the last level change, written from the data.
 * @param {MergedResult[]} periods Oldest first.
 */
export function levelChangeText(periods) {
  const levels = periods
    .filter((row) => getResultDisplay(row.maturity, 'maturity').showScore)
    .map((row) => ({ level: /** @type {number} */ (row.maturity?.level), row }));
  if (levels.length === 0) return 'Belum ada level maturity di rentang ini.';
  for (let index = levels.length - 1; index > 0; index -= 1) {
    const { level, row } = levels[index];
    const before = levels[index - 1].level;
    if (level !== before) {
      const verb = level > before ? 'Naik' : 'Turun';
      return `${verb} ke Level ${level} pada ${formatPeriod(row.period_type, row.period_start)} (sebelumnya Level ${before}).`;
    }
  }
  const { level, row } = levels[0];
  return `Level ${level} sejak ${formatPeriod(row.period_type, row.period_start)}.`;
}

/**
 * "Menuju Level n+1": how far the numbers are from the next level's requirements (taken from
 * the rule version used). Only a comparison of the numbers shown — NOT the backend's gate (which
 * also needs consecutive periods). `null` when the next level is unknown.
 * @param {Result | null | undefined} maturity
 * @param {{ level: number, min_score: number, min_dimension: number }[]} levels
 */
export function nextLevelGap(maturity, levels) {
  const next = levels.find((row) => row.level === (maturity?.level ?? 0) + 1);
  if (!maturity || !next) return null;
  return {
    level: next.level,
    scoreShort: Math.max(0, next.min_score - (maturity.score ?? 0)),
    belowDimensions: maturity.dimensions
      .filter((d) => !d.is_na && (d.score ?? 0) < next.min_dimension)
      .map((d) => d.code),
  };
}
