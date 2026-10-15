import { z } from 'zod';
import { firstValue } from '@/lib/api/lists';
import { DIRECTIONS, UNITS } from '@/features/sla-shared/constants';

/*
 * `/sla-catalog` and `/maturity-catalog` (Postman, no response examples). Field names are read
 * from their likely variants — docs/ASSUMPTIONS.md SL1.
 */

/** @param {unknown} value */
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** "PERCENT" / "%" → percent, "MINUTES" / "menit" → minutes, anything else → score. @param {unknown} raw */
export function toUnit(raw) {
  const text = String(raw ?? '').toUpperCase();
  if (text.includes('PERCENT') || text.includes('%') || text === 'PCT') return UNITS.PERCENT;
  if (text.includes('MIN') || text.includes('MENIT')) return UNITS.MINUTES;
  return UNITS.SCORE;
}

/** "DOWN" / "LOWER_IS_BETTER" → down, anything else → up. @param {unknown} raw */
export function toDirection(raw) {
  const text = String(raw ?? '').toUpperCase();
  return text.includes('DOWN') || text.includes('LOWER') || text.includes('DESC')
    ? DIRECTIONS.DOWN
    : DIRECTIONS.UP;
}

const number = z.coerce.number();

/** One catalog entry (indicator or dimension). */
const catalogItemSchema = z.preprocess(
  (raw) => {
    if (!isRecord(raw)) return raw;
    const r = /** @type {any} */ (raw);
    return {
      code: firstValue(r.code, r.indicator_code, r.dimension_code),
      unit: toUnit(firstValue(r.unit, r.unit_type)),
      direction: toDirection(firstValue(r.direction, r.better)),
      sla: firstValue(r.sla, r.for_sla, r.supports_sla) ?? true,
      maturity: firstValue(r.maturity, r.for_maturity, r.supports_maturity) ?? true,
    };
  },
  z.object({
    code: z.coerce.string(),
    unit: z.enum(Object.values(UNITS)),
    direction: z.enum(Object.values(DIRECTIONS)),
    sla: z.boolean().catch(true),
    maturity: z.boolean().catch(true),
  }),
);

/** @typedef {z.infer<typeof catalogItemSchema>} CatalogItem */

/** The array of a body: bare, `data`, or `data.<key>` / `<key>`. @param {unknown} raw @param {string[]} keys */
function findList(raw, keys) {
  if (Array.isArray(raw)) return raw;
  const body = /** @type {any} */ (isRecord(raw) ? raw : {});
  const data = isRecord(body.data) ? body.data : body;
  for (const key of keys) if (Array.isArray(data[key])) return data[key];
  return Array.isArray(body.data) ? body.data : [];
}

export const slaCatalogSchema = z.preprocess(
  (raw) => findList(raw, ['indicators', 'items', 'catalog']),
  z.array(catalogItemSchema),
);

/** Requirements of one maturity level. */
export const levelSchema = z.preprocess(
  (raw) => {
    if (!isRecord(raw)) return raw;
    const r = /** @type {any} */ (raw);
    return {
      level: r.level,
      min_score: r.min_score,
      min_dimension: firstValue(r.min_dimension, r.min_dimension_score),
      consecutive_periods: firstValue(r.consecutive_periods, r.periods),
    };
  },
  z.object({
    level: z.coerce.number().int(),
    min_score: number,
    min_dimension: number,
    consecutive_periods: z.coerce.number().int(),
  }),
);

/** @typedef {z.infer<typeof levelSchema>} LevelRequirement */

export const maturityCatalogSchema = z.preprocess(
  (raw) => ({
    dimensions: findList(raw, ['dimensions', 'items']),
    levels: findList(raw, ['levels', 'default_levels', 'level_requirements']),
  }),
  z.object({ dimensions: z.array(catalogItemSchema), levels: z.array(levelSchema).catch([]) }),
);
