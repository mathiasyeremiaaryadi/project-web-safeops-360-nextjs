/*
 * SLA & maturity constants shared by the rules and the results features. Units, directions and
 * which indicator is usable where come from the backend catalogs — only labels live here.
 */

/** Display label and short description per indicator / dimension code. */
export const INDICATOR_LABELS = Object.freeze({
  COMPLETION_RATE: {
    label: 'Tingkat penyelesaian',
    description: 'Task yang diselesaikan dari semua task.',
  },
  ON_TIME_RATE: { label: 'Ketepatan waktu', description: 'Task yang selesai tepat waktu.' },
  AVG_LATE_MINUTES: {
    label: 'Rata-rata keterlambatan',
    description: 'Rata-rata menit terlambat per task.',
  },
  LATE_UPLOAD_RATE: { label: 'Upload susulan', description: 'Laporan yang diunggah susulan.' },
  EVIDENCE_COMPLETE_RATE: {
    label: 'Kelengkapan foto',
    description: 'Laporan dengan foto sebelum dan sesudah.',
  },
  K3_FINDING_NOTES_RATE: {
    label: 'Temuan K3 berpenjelasan',
    description: 'Temuan K3 yang diberi penjelasan.',
  },
  CONSISTENCY: { label: 'Konsistensi', description: 'Kestabilan kinerja antarperiode.' },
});

/** Label of an indicator code; an unknown code is shown as itself. @param {string} code */
export const indicatorLabel = (code) =>
  INDICATOR_LABELS[/** @type {keyof typeof INDICATOR_LABELS} */ (code)]?.label ?? code;

export const PERIOD_TYPES = Object.freeze({ WEEK: 'WEEK', MONTH: 'MONTH', QUARTER: 'QUARTER' });

export const PERIOD_LABELS = Object.freeze({
  [PERIOD_TYPES.WEEK]: 'Mingguan',
  [PERIOD_TYPES.MONTH]: 'Bulanan',
  [PERIOD_TYPES.QUARTER]: 'Kuartalan',
});

/** Result scope (`scope=` of the score endpoints). */
export const SCOPES = Object.freeze({ VENDOR: 'VENDOR', SITE: 'SITE', WORKER: 'WORKER' });

export const SCOPE_LABELS = Object.freeze({
  [SCOPES.VENDOR]: 'Vendor',
  [SCOPES.SITE]: 'Vendor di site',
  [SCOPES.WORKER]: 'Worker',
});

/** Status of a result row. */
export const RESULT_STATUS = Object.freeze({ OK: 'OK', NO_DATA: 'NO_DATA', NO_RULE: 'NO_RULE' });

export const LEVEL_NAMES = Object.freeze({
  1: 'Awal',
  2: 'Terkelola',
  3: 'Terstandar',
  4: 'Terukur',
  5: 'Terus membaik',
});

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;
/** Levels with requirements in a maturity rule (Level 1 applies when Level 2 is not met). */
export const RULE_LEVELS = Object.freeze([2, 3, 4, 5]);

/** Rule types (`?type=`) and their API paths. */
export const RULE_TYPES = Object.freeze({ SLA: 'sla', MATURITY: 'maturity' });

export const RULE_TYPE_LABELS = Object.freeze({
  [RULE_TYPES.SLA]: 'SLA',
  [RULE_TYPES.MATURITY]: 'maturity',
});

/** Weights of a rule must add up to exactly this (with a rounding tolerance). */
export const WEIGHT_TOTAL = 100;
export const WEIGHT_TOLERANCE = 0.01;

/** Normalised indicator units and directions (from the catalog). */
export const UNITS = Object.freeze({ PERCENT: 'percent', MINUTES: 'minutes', SCORE: 'score' });
export const DIRECTIONS = Object.freeze({ UP: 'up', DOWN: 'down' });

/** Highest valid percentage / score. */
export const MAX_PERCENT = 100;
