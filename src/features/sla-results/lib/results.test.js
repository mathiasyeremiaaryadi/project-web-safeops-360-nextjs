import { describe, expect, it } from 'vitest';
import {
  formatIndicatorValue,
  formatPeriod,
  formatScore,
  formatTarget,
  getResultDisplay,
  levelChangeText,
  mergeResults,
  nextLevelGap,
  periodStartBefore,
  previousPeriodRange,
  scoreChartBars,
  summarizeResults,
} from '@/features/sla-results/lib/results';

/** @param {Record<string, unknown>} fields */
const result = (fields = {}) => ({
  scope_type: 'SITE',
  vendor_id: 'v1',
  vendor_name: 'PT Bersih Jaya',
  site_id: 's1',
  site_name: 'PLTU Paiton',
  worker_id: null,
  worker_name: null,
  period_type: 'MONTH',
  period_start: '2026-10-01',
  period_end: '2026-10-31',
  status: 'OK',
  score: 98.1,
  compliant: true,
  task_count: 412,
  live: true,
  rule_id: 'r1',
  rule_version: 3,
  level: 4,
  items: [
    { code: 'COMPLETION_RATE', met: true, is_na: false },
    { code: 'ON_TIME_RATE', met: false, is_na: false },
    { code: 'K3_FINDING_NOTES_RATE', met: null, is_na: true },
  ],
  dimensions: [],
  ...fields,
});

describe('mergeResults', () => {
  it('joins SLA and maturity of the same entity and period, keeping one-sided rows', () => {
    const merged = mergeResults(
      [result(), result({ vendor_id: 'v2', vendor_name: 'PT Karya Aman' })],
      [result({ level: 4 }), result({ vendor_id: 'v3', vendor_name: 'PT Sinar Prima' })],
    );
    expect(merged.map((m) => [m.vendor_id, Boolean(m.sla), Boolean(m.maturity)])).toEqual([
      ['v1', true, true],
      ['v2', true, false],
      ['v3', false, true],
    ]);
    expect(merged[0].live).toBe(true);
  });

  it('keeps other periods and sites apart', () => {
    const merged = mergeResults(
      [result(), result({ period_start: '2026-09-01' }), result({ site_id: 's4' })],
      [],
    );
    expect(merged).toHaveLength(3);
  });
});

describe('getResultDisplay', () => {
  it('OK: score with the met count, coloured by compliance', () => {
    expect(getResultDisplay(result())).toMatchObject({
      state: 'OK',
      showScore: true,
      badge: { label: 'Tercapai' },
      message: '1 dari 2 indikator tercapai',
      tone: 'success',
      live: true,
    });
    expect(getResultDisplay(result({ compliant: false, live: false }))).toMatchObject({
      badge: { label: 'Tidak tercapai' },
      tone: 'warning',
      live: false,
    });
  });

  it('NO_DATA never shows a score (not even 0)', () => {
    for (const fields of [
      { status: 'NO_DATA', score: null },
      { status: 'NO_DATA', score: 0 },
    ]) {
      const display = getResultDisplay(result(fields));
      expect(display).toMatchObject({ state: 'NO_DATA', showScore: false, offerRule: false });
      expect(display.badge.label).toBe('Tidak ada data');
    }
  });

  it('NO_RULE invites to create a rule', () => {
    expect(getResultDisplay(result({ status: 'NO_RULE', score: null }))).toMatchObject({
      state: 'NO_RULE',
      showScore: false,
      offerRule: true,
      badge: { label: 'Belum ada aturan SLA' },
    });
    expect(getResultDisplay(result({ status: 'NO_RULE' }), 'maturity').badge.label).toBe(
      'Belum ada aturan maturity',
    );
  });

  it('maturity OK shows the level; a missing result shows nothing', () => {
    expect(getResultDisplay(result(), 'maturity').badge.label).toBe('Level 4 · Terukur');
    expect(getResultDisplay(null)).toMatchObject({ state: 'MISSING', showScore: false });
  });
});

describe('formatting', () => {
  it('formats scores and indicator values the Indonesian way', () => {
    expect(formatScore(95.62)).toBe('95,6');
    expect(formatScore(null)).toBe('—');
    expect(formatIndicatorValue(86, 'percent')).toBe('86%');
    expect(formatIndicatorValue(12.5, 'minutes')).toBe('12,5 menit');
    expect(formatIndicatorValue(88.14, 'score')).toBe('88,1');
    expect(formatIndicatorValue(10, 'percent', true)).toBe('N/A');
    expect(formatTarget(95, 'percent', 'up')).toBe('≥ 95%');
    expect(formatTarget(15, 'minutes', 'down')).toBe('≤ 15 menit');
  });

  it('formats calendar periods and steps back', () => {
    expect(formatPeriod('MONTH', '2026-10-01')).toBe('Oktober 2026');
    expect(formatPeriod('QUARTER', '2026-10-01')).toBe('Kuartal 4 2026');
    expect(formatPeriod('WEEK', '2026-10-12')).toBe('12 Okt – 18 Okt 2026');
    expect(periodStartBefore('MONTH', '2026-01-01')).toBe('2025-12-01');
    expect(periodStartBefore('QUARTER', '2026-10-01', 2)).toBe('2026-04-01');
    expect(periodStartBefore('WEEK', '2026-10-12')).toBe('2026-10-05');
  });
});

describe('summarizeResults / previousPeriodRange', () => {
  it('aggregates the OK rows only; NO_DATA / NO_RULE are counted apart', () => {
    const rows = mergeResults(
      [
        result({ vendor_id: 'a', score: 98, compliant: true }),
        result({ vendor_id: 'b', score: 88, compliant: false }),
        result({ vendor_id: 'c', status: 'NO_RULE', score: null }),
        result({ vendor_id: 'd', status: 'NO_DATA', score: null }),
      ],
      [result({ vendor_id: 'a', level: 4 }), result({ vendor_id: 'b', level: 2 })],
    );
    expect(summarizeResults(rows)).toEqual({
      okCount: 2,
      averageScore: 93,
      compliantCount: 1,
      highestLevel: 4,
      noRule: 1,
      noData: 1,
      levelCounts: { 2: 1, 4: 1 },
    });
    expect(summarizeResults([])).toMatchObject({ averageScore: null, highestLevel: null });
  });

  it('covers the previous period of every row', () => {
    const rows = mergeResults(
      [result(), result({ vendor_id: 'w', period_type: 'WEEK', period_start: '2026-10-12' })],
      [],
    );
    expect(previousPeriodRange(rows)).toEqual({ from: '2026-09-01', to: '2026-10-05' });
  });
});

describe('history chart', () => {
  /** Bersih Jaya · Paiton, May–Oct (Oct live), levels 3 ×4 then 4. */
  const months = [
    ['2026-05-01', 96.2, true, 3],
    ['2026-06-01', 97.0, true, 3],
    ['2026-07-01', 92.4, false, 3],
    ['2026-08-01', 97.8, true, 3],
    ['2026-09-01', 95.6, false, 4],
    ['2026-10-01', 98.1, true, 4],
  ];
  const periods = mergeResults(
    months.map(([start, score, compliant], i) =>
      result({ period_start: start, score, compliant, live: i === months.length - 1 }),
    ),
    months.map(([start, , , level], i) =>
      result({ period_start: start, level, live: i === months.length - 1 }),
    ),
  );

  it('bars start from an automatic baseline, coloured by compliance, live apart', () => {
    const bars = scoreChartBars(periods);
    expect(bars.map((b) => b.tone)).toEqual([
      'success',
      'success',
      'warning',
      'success',
      'warning',
      'live',
    ]);
    expect(bars.map((b) => b.label)).toEqual(['96,2', '97', '92,4', '97,8', '95,6', '98,1']);
    // The lowest score is still a visible bar, the highest is full.
    expect(bars[2].heightPercent).toBeGreaterThan(0);
    expect(bars[5].heightPercent).toBe(100);
  });

  it('a period without data has no bar', () => {
    const [bar] = scoreChartBars(mergeResults([result({ status: 'NO_DATA', score: null })], []));
    expect(bar).toMatchObject({ heightPercent: 0, label: '—', tone: null });
  });

  it('describes the last level change from the data', () => {
    expect(levelChangeText(periods)).toBe(
      'Naik ke Level 4 pada September 2026 (sebelumnya Level 3).',
    );
    expect(levelChangeText(periods.slice(0, 3))).toBe('Level 3 sejak Mei 2026.');
    expect(levelChangeText([])).toBe('Belum ada level maturity di rentang ini.');
  });
});

describe('nextLevelGap', () => {
  const levels = [
    { level: 4, min_score: 85, min_dimension: 75 },
    { level: 5, min_score: 95, min_dimension: 85 },
  ];
  it('compares the shown numbers with the next level', () => {
    const maturity = result({
      level: 4,
      score: 91,
      dimensions: [
        { code: 'ON_TIME_RATE', score: 80, is_na: false },
        { code: 'COMPLETION_RATE', score: 97, is_na: false },
        { code: 'K3_FINDING_NOTES_RATE', score: null, is_na: true },
      ],
    });
    expect(nextLevelGap(maturity, levels)).toEqual({
      level: 5,
      scoreShort: 4,
      belowDimensions: ['ON_TIME_RATE'],
    });
  });

  it('is null at the top level or without the rule levels', () => {
    expect(nextLevelGap(result({ level: 5 }), levels)).toBeNull();
    expect(nextLevelGap(result({ level: 3 }), [])).toBeNull();
  });
});
