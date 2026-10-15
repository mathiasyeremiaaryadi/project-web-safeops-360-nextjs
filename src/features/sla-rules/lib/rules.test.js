import { describe, expect, it } from 'vitest';
import {
  diffVersions,
  emptyFormValues,
  levelsToInputs,
  parseNumber,
  ruleFormSchema,
  ruleToFormValues,
  sumWeights,
  toRulePayload,
  validateLevels,
  validateTarget,
  weightStatus,
} from '@/features/sla-rules/lib/rules';

const CATALOG = [
  { code: 'COMPLETION_RATE', unit: 'percent', direction: 'up', sla: true, maturity: true },
  { code: 'ON_TIME_RATE', unit: 'percent', direction: 'up', sla: true, maturity: true },
  { code: 'AVG_LATE_MINUTES', unit: 'minutes', direction: 'down', sla: true, maturity: true },
  { code: 'LATE_UPLOAD_RATE', unit: 'percent', direction: 'down', sla: true, maturity: true },
];
const BY_CODE = Object.fromEntries(CATALOG.map((item) => [item.code, item]));
const UNITS_BY_CODE = Object.fromEntries(CATALOG.map((item) => [item.code, item.unit]));
const LEVELS = [
  { level: 2, min_score: 60, min_dimension: 50, consecutive_periods: 1 },
  { level: 3, min_score: 75, min_dimension: 65, consecutive_periods: 2 },
  { level: 4, min_score: 85, min_dimension: 75, consecutive_periods: 3 },
  { level: 5, min_score: 95, min_dimension: 85, consecutive_periods: 3 },
];

/** @param {Record<string, [string, string?]>} used code → [weight, target] */
const formWith = (used, extra = {}) => {
  const values = emptyFormValues(CATALOG, LEVELS, {
    vendor: { value: 'v1', label: 'PT Bersih Jaya' },
  });
  for (const [code, [weight, target = '']] of Object.entries(used)) {
    values.items[code] = { enabled: true, weight, target };
  }
  return { ...values, ...extra };
};

/** @param {'sla' | 'maturity'} type @param {object} values @param {boolean} [siteOnly] */
const errorsOf = (type, values, siteOnly = false) =>
  (
    ruleFormSchema(type, { units: UNITS_BY_CODE, siteOnly }).safeParse(values).error?.issues ?? []
  ).map((issue) => [issue.path.join('.'), issue.message]);

describe('weights', () => {
  it('sums the enabled items, with a comma or a dot', () => {
    const items = formWith({ COMPLETION_RATE: ['40,5'], ON_TIME_RATE: ['59.5'] }).items;
    expect(sumWeights(items)).toBe(100);
    expect(weightStatus(items)).toMatchObject({
      valid: true,
      message: 'Total bobot 100 / 100 · 2 indikator dipakai',
    });
  });

  it('says how much is missing or too much', () => {
    expect(weightStatus(formWith({ COMPLETION_RATE: ['95'] }).items).message).toBe(
      'Total harus tepat 100. Kurang 5.',
    );
    expect(
      weightStatus(formWith({ COMPLETION_RATE: ['60'], ON_TIME_RATE: ['50,5'] }).items).message,
    ).toBe('Total harus tepat 100. Lebih 10,5.');
    expect(parseNumber('')).toBeNaN();
  });
});

describe('validateTarget', () => {
  it.each([
    ['95', 'percent', null],
    ['101', 'percent', 'Target harus 0–100%.'],
    ['-1', 'minutes', 'Target tidak boleh negatif.'],
    ['120', 'minutes', null],
    ['', 'score', 'Target wajib diisi.'],
  ])('%s %s', (target, unit, message) => {
    expect(validateTarget(target, unit)).toBe(message);
  });
});

describe('validateLevels', () => {
  it('accepts rising requirements', () => {
    expect(validateLevels(levelsToInputs(LEVELS))).toEqual([]);
  });

  it('rejects a column that goes down', () => {
    const levels = levelsToInputs(LEVELS);
    levels[2].min_score = '70';
    expect(validateLevels(levels)).toEqual([
      { index: 2, field: 'min_score', message: 'Harus sama atau lebih tinggi dari Level 3.' },
    ]);
  });

  it('rejects values out of range, fractional or missing periods', () => {
    const levels = levelsToInputs(LEVELS);
    levels[3].min_dimension = '120';
    levels[3].consecutive_periods = '3,5';
    levels[0].min_score = '';
    expect(validateLevels(levels)).toEqual([
      { index: 0, field: 'min_score', message: 'Wajib diisi.' },
      { index: 3, field: 'min_dimension', message: 'Harus 0–100.' },
      { index: 3, field: 'consecutive_periods', message: 'Bilangan bulat minimal 1.' },
    ]);
  });
});

describe('ruleFormSchema', () => {
  it('passes a complete SLA rule', () => {
    expect(
      errorsOf('sla', formWith({ COMPLETION_RATE: ['60', '95'], AVG_LATE_MINUTES: ['40', '15'] })),
    ).toEqual([]);
  });

  it('mirrors the backend 400s', () => {
    expect(errorsOf('sla', formWith({}, { vendor: null }))).toEqual([
      ['vendor', 'Vendor wajib dipilih.'],
      ['items', 'Pilih minimal satu indikator.'],
    ]);
    expect(
      errorsOf('sla', formWith({ COMPLETION_RATE: ['0', '120'], ON_TIME_RATE: ['100', '90'] })),
    ).toEqual([
      ['items.COMPLETION_RATE.weight', 'Bobot harus lebih dari 0.'],
      ['items.COMPLETION_RATE.target', 'Target harus 0–100%.'],
    ]);
  });

  it('Admin: only a site override, with a site', () => {
    const values = formWith({ COMPLETION_RATE: ['100', '95'] });
    expect(errorsOf('sla', values, true)).toEqual([
      ['scope', 'Hanya Super Admin yang bisa membuat aturan default vendor.'],
    ]);
    expect(errorsOf('sla', { ...values, scope: 'SITE' }, true)).toEqual([
      ['site_id', 'Pilih site.'],
    ]);
  });

  it('maturity checks the levels, not the targets', () => {
    const values = formWith({ ON_TIME_RATE: ['100'] });
    values.levels[3].min_score = '80';
    expect(errorsOf('maturity', values)).toEqual([
      ['levels.3.min_score', 'Harus sama atau lebih tinggi dari Level 4.'],
    ]);
  });
});

describe('toRulePayload', () => {
  it('sends only the enabled items, as numbers', () => {
    const values = formWith({ COMPLETION_RATE: ['60', '95,5'], AVG_LATE_MINUTES: ['40', '15'] });
    expect(toRulePayload(values, 'sla', LEVELS)).toEqual({
      vendor_id: 'v1',
      site_id: null,
      period_type: 'MONTH',
      indicators: [
        { code: 'COMPLETION_RATE', weight: 60, target: 95.5 },
        { code: 'AVG_LATE_MINUTES', weight: 40, target: 15 },
      ],
    });
  });

  it('maturity: levels only when changed; a site override sends its site', () => {
    const values = formWith({ ON_TIME_RATE: ['100'] }, { scope: 'SITE', site_id: 's1' });
    expect(toRulePayload(values, 'maturity', LEVELS)).toEqual({
      vendor_id: 'v1',
      site_id: 's1',
      period_type: 'MONTH',
      dimensions: [{ code: 'ON_TIME_RATE', weight: 100 }],
    });
    values.levels[0].min_score = '65';
    expect(toRulePayload(values, 'maturity', LEVELS).levels?.[0]).toEqual({
      level: 2,
      min_score: 65,
      min_dimension: 50,
      consecutive_periods: 1,
    });
  });
});

const ruleV2 = {
  id: 'r2',
  vendor_id: 'v1',
  site_id: null,
  period_type: 'MONTH',
  version: 2,
  is_active: false,
  indicators: [
    { code: 'COMPLETION_RATE', weight: 75, target: 95 },
    { code: 'LATE_UPLOAD_RATE', weight: 25, target: 15 },
  ],
  dimensions: [],
  levels: [],
};
const ruleV3 = {
  ...ruleV2,
  id: 'r3',
  version: 3,
  period_type: 'WEEK',
  indicators: [
    { code: 'COMPLETION_RATE', weight: 70, target: 95 },
    { code: 'LATE_UPLOAD_RATE', weight: 25, target: 10 },
    { code: 'ON_TIME_RATE', weight: 5, target: 90 },
  ],
};

describe('ruleToFormValues', () => {
  it('prefills the edit form from the active version', () => {
    const values = ruleToFormValues(ruleV3, 'sla', CATALOG, LEVELS, 'PT Bersih Jaya');
    expect(values.vendor).toEqual({ value: 'v1', label: 'PT Bersih Jaya' });
    expect(values.scope).toBe('DEFAULT');
    expect(values.period_type).toBe('WEEK');
    expect(values.items.LATE_UPLOAD_RATE).toEqual({ enabled: true, weight: '25', target: '10' });
    expect(values.items.AVG_LATE_MINUTES.enabled).toBe(false);
    expect(values.levels).toEqual(levelsToInputs(LEVELS));
  });
});

describe('diffVersions', () => {
  it('summarises period, weight, target and added indicators', () => {
    const diff = diffVersions(ruleV2, ruleV3, 'sla', BY_CODE);
    expect(diff.summary).toBe(
      'Periode Bulanan → Mingguan; Bobot tingkat penyelesaian 75 → 70; target upload susulan ≤ 15% → ≤ 10%; Tambah indikator ketepatan waktu',
    );
    expect(diff.changed).toEqual({
      COMPLETION_RATE: { weight: true },
      LATE_UPLOAD_RATE: { target: true },
      ON_TIME_RATE: { added: true, weight: true, target: true },
    });
  });

  it('the first version is "Aturan awal"', () => {
    expect(diffVersions(null, ruleV2, 'sla', BY_CODE).summary).toBe('Aturan awal');
  });
});
