import { z } from 'zod';
import {
  formatScore,
  formatTarget,
  indicatorLabel,
  MAX_PERCENT,
  PERIOD_LABELS,
  PERIOD_TYPES,
  RULE_LEVELS,
  RULE_TYPES,
  UNITS,
  WEIGHT_TOLERANCE,
  WEIGHT_TOTAL,
} from '@/features/sla-shared';

/*
 * Rule form logic (pure): validation mirroring the backend's 400s, payload, prefill and the
 * change summary between versions. No score is computed here.
 */

/** @typedef {import('@/features/sla-rules/api/schemas').Rule} Rule */
/** @typedef {import('@/features/sla-rules/api/schemas').CatalogItem} CatalogItem */
/** @typedef {import('@/features/sla-rules/api/schemas').LevelRequirement} LevelRequirement */
/** @typedef {'sla' | 'maturity'} RuleType */

/** "Berlaku untuk": the vendor default (`site_id: null`) or a site override. */
export const RULE_SCOPES = Object.freeze({ DEFAULT: 'DEFAULT', SITE: 'SITE' });

/**
 * A number typed by the user ("12,5" or "12.5"); `NaN` when empty or invalid.
 * @param {string | number | null | undefined} value
 */
export function parseNumber(value) {
  if (typeof value === 'number') return value;
  const text = String(value ?? '')
    .trim()
    .replace(',', '.');
  return text === '' ? Number.NaN : Number(text);
}

/** @param {number} value */
const toInput = (value) => (Number.isFinite(value) ? String(value).replace('.', ',') : '');

/**
 * @typedef {object} RuleFormValues
 * @property {{ value: string, label: string } | null} vendor
 * @property {'DEFAULT' | 'SITE'} scope
 * @property {string} site_id
 * @property {string} period_type
 * @property {Record<string, { enabled: boolean, weight: string, target: string }>} items
 * @property {{ level: number, min_score: string, min_dimension: string, consecutive_periods: string }[]} levels
 */

/**
 * Total weight of the enabled items.
 * @param {RuleFormValues['items']} items
 */
export function sumWeights(items) {
  return Object.values(items)
    .filter((item) => item.enabled)
    .reduce((total, item) => total + (parseNumber(item.weight) || 0), 0);
}

/**
 * "Total bobot 100 / 100 · 6 indikator dipakai" or "Total harus tepat 100. Kurang 5."
 * @param {RuleFormValues['items']} items
 */
export function weightStatus(items) {
  const total = sumWeights(items);
  const used = Object.values(items).filter((item) => item.enabled).length;
  const gap = Math.round((WEIGHT_TOTAL - total) * 100) / 100;
  if (Math.abs(gap) <= WEIGHT_TOLERANCE) {
    return {
      valid: true,
      total,
      message: `Total bobot ${WEIGHT_TOTAL} / ${WEIGHT_TOTAL} · ${used} indikator dipakai`,
    };
  }
  const direction = gap > 0 ? 'Kurang' : 'Lebih';
  return {
    valid: false,
    total,
    message: `Total harus tepat ${WEIGHT_TOTAL}. ${direction} ${formatScore(Math.abs(gap))}.`,
  };
}

/**
 * Error of a target, by unit: percent 0–100, minutes / score ≥ 0.
 * @param {string} target
 * @param {string} unit
 * @returns {string | null}
 */
export function validateTarget(target, unit) {
  const value = parseNumber(target);
  if (!Number.isFinite(value)) return 'Target wajib diisi.';
  if (unit === UNITS.PERCENT && (value < 0 || value > MAX_PERCENT)) return 'Target harus 0–100%.';
  if (value < 0) return 'Target tidak boleh negatif.';
  return null;
}

/** Level columns that must stay the same or rise from one level to the next. */
const LEVEL_FIELDS = /** @type {const} */ (['min_score', 'min_dimension', 'consecutive_periods']);

/**
 * Errors of the level requirements (Level 2–5): complete, 0–100, whole periods ≥ 1, and every
 * column the same or higher than the level below.
 * @param {RuleFormValues['levels']} levels
 * @returns {{ index: number, field: string, message: string }[]}
 */
export function validateLevels(levels) {
  /** @type {{ index: number, field: string, message: string }[]} */
  const errors = [];
  levels.forEach((row, index) => {
    for (const field of LEVEL_FIELDS) {
      const value = parseNumber(row[field]);
      const isPeriods = field === 'consecutive_periods';
      let message = null;
      if (!Number.isFinite(value)) message = 'Wajib diisi.';
      else if (isPeriods && (!Number.isInteger(value) || value < 1)) {
        message = 'Bilangan bulat minimal 1.';
      } else if (!isPeriods && (value < 0 || value > MAX_PERCENT)) message = 'Harus 0–100.';
      else if (index > 0 && value < parseNumber(levels[index - 1][field])) {
        message = `Harus sama atau lebih tinggi dari Level ${levels[index - 1].level}.`;
      }
      if (message) errors.push({ index, field, message });
    }
  });
  return errors;
}

/**
 * Form schema of a rule, mirroring the backend's 400 validation.
 * @param {RuleType} type
 * @param {{ units: Record<string, string>, siteOnly: boolean }} options `units` per code;
 *   `siteOnly`: the user may only create site overrides (Admin).
 */
export function ruleFormSchema(type, { units, siteOnly }) {
  const option = z.object({ value: z.string(), label: z.string() });
  return z
    .object({
      vendor: option.nullable(),
      scope: z.enum([RULE_SCOPES.DEFAULT, RULE_SCOPES.SITE]),
      site_id: z.string(),
      period_type: z.enum(Object.values(PERIOD_TYPES)),
      items: z.record(
        z.string(),
        z.object({ enabled: z.boolean(), weight: z.string(), target: z.string() }),
      ),
      levels: z.array(
        z.object({
          level: z.number(),
          min_score: z.string(),
          min_dimension: z.string(),
          consecutive_periods: z.string(),
        }),
      ),
    })
    .superRefine((values, ctx) => {
      /** @param {(string | number)[]} path @param {string} message */
      const issue = (path, message) => ctx.addIssue({ code: 'custom', path, message });
      if (!values.vendor) issue(['vendor'], 'Vendor wajib dipilih.');
      if (siteOnly && values.scope !== RULE_SCOPES.SITE) {
        issue(['scope'], 'Hanya Super Admin yang bisa membuat aturan default vendor.');
      }
      if (values.scope === RULE_SCOPES.SITE && !values.site_id) issue(['site_id'], 'Pilih site.');

      const enabled = Object.entries(values.items).filter(([, item]) => item.enabled);
      if (enabled.length === 0) issue(['items'], 'Pilih minimal satu indikator.');
      for (const [code, item] of enabled) {
        if (!(parseNumber(item.weight) > 0)) {
          issue(['items', code, 'weight'], 'Bobot harus lebih dari 0.');
        }
        if (type === RULE_TYPES.SLA) {
          const message = validateTarget(item.target, units[code]);
          if (message) issue(['items', code, 'target'], message);
        }
      }
      if (enabled.length > 0 && !weightStatus(values.items).valid) {
        issue(['items'], weightStatus(values.items).message);
      }
      if (type === RULE_TYPES.MATURITY) {
        for (const error of validateLevels(values.levels)) {
          issue(['levels', error.index, error.field], error.message);
        }
      }
    });
}

/** @param {LevelRequirement[]} levels @returns {RuleFormValues['levels']} */
export const levelsToInputs = (levels) =>
  RULE_LEVELS.map((level) => {
    const row = levels.find((l) => l.level === level);
    return {
      level,
      min_score: row ? toInput(row.min_score) : '',
      min_dimension: row ? toInput(row.min_dimension) : '',
      consecutive_periods: row ? String(row.consecutive_periods) : '',
    };
  });

/** @param {RuleFormValues['levels']} levels @returns {LevelRequirement[]} */
const inputsToLevels = (levels) =>
  levels.map((row) => ({
    level: row.level,
    min_score: parseNumber(row.min_score),
    min_dimension: parseNumber(row.min_dimension),
    consecutive_periods: parseNumber(row.consecutive_periods),
  }));

/** @param {LevelRequirement[]} a @param {LevelRequirement[]} b */
export const levelsEqual = (a, b) =>
  a.length === b.length &&
  a.every((row) => {
    const other = b.find((l) => l.level === row.level);
    return other && LEVEL_FIELDS.every((field) => other[field] === row[field]);
  });

/**
 * Empty form (or prefilled from a CTA: vendor / site).
 * @param {CatalogItem[]} catalog Items usable for this rule type.
 * @param {LevelRequirement[]} defaultLevels
 * @param {{ vendor?: { value: string, label: string } | null, siteId?: string, siteOnly?: boolean }} [prefill]
 * @returns {RuleFormValues}
 */
export function emptyFormValues(catalog, defaultLevels, prefill = {}) {
  return {
    vendor: prefill.vendor ?? null,
    scope: prefill.siteId || prefill.siteOnly ? RULE_SCOPES.SITE : RULE_SCOPES.DEFAULT,
    site_id: prefill.siteId ?? '',
    period_type: PERIOD_TYPES.MONTH,
    items: Object.fromEntries(
      catalog.map((item) => [item.code, { enabled: false, weight: '', target: '' }]),
    ),
    levels: levelsToInputs(defaultLevels),
  };
}

/**
 * Form values of the active version, to post the next one ("Edit").
 * @param {Rule} rule
 * @param {RuleType} type
 * @param {CatalogItem[]} catalog
 * @param {LevelRequirement[]} defaultLevels
 * @param {string} vendorLabel
 * @returns {RuleFormValues}
 */
export function ruleToFormValues(rule, type, catalog, defaultLevels, vendorLabel) {
  const used = type === RULE_TYPES.SLA ? rule.indicators : rule.dimensions;
  return {
    vendor: { value: rule.vendor_id, label: vendorLabel },
    scope: rule.site_id ? RULE_SCOPES.SITE : RULE_SCOPES.DEFAULT,
    site_id: rule.site_id ?? '',
    period_type: rule.period_type,
    items: Object.fromEntries(
      catalog.map((item) => {
        const row = /** @type {{ code: string, weight: number, target?: number | null }[]} */ (
          used
        ).find((u) => u.code === item.code);
        return [
          item.code,
          {
            enabled: Boolean(row),
            weight: row ? toInput(row.weight) : '',
            target: row?.target !== null && row?.target !== undefined ? toInput(row.target) : '',
          },
        ];
      }),
    ),
    levels: levelsToInputs(rule.levels.length ? rule.levels : defaultLevels),
  };
}

/**
 * Body of `POST /{type}-rules`: only the enabled items, as numbers; `levels` only when they
 * differ from the defaults (the backend copies the system defaults otherwise).
 * @param {RuleFormValues} values
 * @param {RuleType} type
 * @param {LevelRequirement[]} defaultLevels
 */
export function toRulePayload(values, type, defaultLevels) {
  const enabled = Object.entries(values.items).filter(([, item]) => item.enabled);
  const base = {
    vendor_id: values.vendor?.value,
    site_id: values.scope === RULE_SCOPES.SITE ? values.site_id : null,
    period_type: values.period_type,
  };
  if (type === RULE_TYPES.SLA) {
    return {
      ...base,
      indicators: enabled.map(([code, item]) => ({
        code,
        weight: parseNumber(item.weight),
        target: parseNumber(item.target),
      })),
    };
  }
  const levels = inputsToLevels(values.levels);
  return {
    ...base,
    dimensions: enabled.map(([code, item]) => ({ code, weight: parseNumber(item.weight) })),
    ...(levelsEqual(levels, defaultLevels) ? {} : { levels }),
  };
}

/** "Tingkat penyelesaian" → "tingkat penyelesaian" (keeps "K3"). @param {string} code */
const lowerLabel = (code) => {
  const label = indicatorLabel(code);
  return label.charAt(0).toLowerCase() + label.slice(1);
};

/**
 * @typedef {object} VersionDiff
 * @property {string} summary "Bobot ketepatan waktu 25 → 30; target upload susulan ≤ 15% → ≤ 10%"
 * @property {Record<string, { weight?: boolean, target?: boolean, added?: boolean }>} changed
 * @property {boolean} periodChanged
 * @property {number[]} levelsChanged Levels whose requirements changed.
 */

/**
 * What changed from one version to the next (shown in "Riwayat versi").
 * @param {Rule | null} prev
 * @param {Rule} curr
 * @param {RuleType} type
 * @param {Record<string, CatalogItem>} catalogByCode Unit / direction per code (targets).
 * @returns {VersionDiff}
 */
export function diffVersions(prev, curr, type, catalogByCode) {
  if (!prev)
    return { summary: 'Aturan awal', changed: {}, periodChanged: false, levelsChanged: [] };
  /** @type {string[]} */
  const parts = [];
  /** @type {VersionDiff['changed']} */
  const changed = {};
  const periodChanged = prev.period_type !== curr.period_type;
  if (periodChanged) {
    const label = (/** @type {string} */ p) =>
      PERIOD_LABELS[/** @type {keyof typeof PERIOD_LABELS} */ (p)] ?? p;
    parts.push(`Periode ${label(prev.period_type)} → ${label(curr.period_type)}`);
  }
  const before = type === RULE_TYPES.SLA ? prev.indicators : prev.dimensions;
  const after = type === RULE_TYPES.SLA ? curr.indicators : curr.dimensions;
  for (const item of /** @type {{ code: string, weight: number, target?: number | null }[]} */ (
    after
  )) {
    const old = /** @type {{ code: string, weight: number, target?: number | null }[]} */ (
      before
    ).find((b) => b.code === item.code);
    if (!old) {
      parts.push(`Tambah indikator ${lowerLabel(item.code)}`);
      changed[item.code] = { added: true, weight: true, target: true };
      continue;
    }
    if (old.weight !== item.weight) {
      parts.push(
        `Bobot ${lowerLabel(item.code)} ${formatScore(old.weight)} → ${formatScore(item.weight)}`,
      );
      changed[item.code] = { ...changed[item.code], weight: true };
    }
    if (type === RULE_TYPES.SLA && old.target !== item.target) {
      const meta = catalogByCode[item.code];
      const fmt = (/** @type {number | null | undefined} */ t) =>
        formatTarget(t, meta?.unit ?? UNITS.SCORE, meta?.direction ?? 'up');
      parts.push(`target ${lowerLabel(item.code)} ${fmt(old.target)} → ${fmt(item.target)}`);
      changed[item.code] = { ...changed[item.code], target: true };
    }
  }
  for (const old of /** @type {{ code: string }[]} */ (before)) {
    if (!after.some((a) => a.code === old.code))
      parts.push(`Hapus indikator ${lowerLabel(old.code)}`);
  }
  const levelsChanged =
    type === RULE_TYPES.MATURITY
      ? curr.levels
          .filter((row) => {
            const old = prev.levels.find((l) => l.level === row.level);
            return !old || !levelsEqual([old], [row]);
          })
          .map((row) => row.level)
      : [];
  if (levelsChanged.length) parts.push(`Syarat Level ${levelsChanged.join(', ')} diubah`);
  return {
    summary: parts.length ? parts.join('; ') : 'Tidak ada perubahan isi',
    changed,
    periodChanged,
    levelsChanged,
  };
}
