import { z } from 'zod';
import { entityResponseSchema, firstValue, listResponseSchema } from '@/lib/api/lists';
import { levelSchema } from '@/features/sla-shared';

/*
 * `/sla-rules`, `/maturity-rules` (Postman, no response
 * examples). Field names are read from their likely variants — docs/ASSUMPTIONS.md SL2–SL3.
 */

/** @param {unknown} value */
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** @param {unknown} value */
const isUuid = (value) => typeof value === 'string' && /^[0-9a-f-]{32,36}$/i.test(value);

const number = z.coerce.number();
const optionalNumber = z.coerce.number().nullish().catch(null);
const optionalText = z.coerce.string().nullish().catch(null);

/** @param {any} raw */
function normaliseRule(raw) {
  const createdBy = raw.created_by;
  return {
    id: raw.id,
    vendor_id: firstValue(raw.vendor_id, raw.vendor?.id),
    vendor_name: firstValue(raw.vendor_name, raw.vendor?.name),
    site_id: firstValue(raw.site_id, raw.site?.id) ?? null,
    site_name: firstValue(raw.site_name, raw.site?.name),
    period_type: raw.period_type,
    version: firstValue(raw.version, raw.version_no, raw.version_number),
    created_by_name: firstValue(
      raw.created_by_name,
      createdBy?.full_name,
      createdBy?.username,
      isUuid(createdBy) ? null : createdBy,
    ),
    created_at: raw.created_at,
    superseded_at: raw.superseded_at,
    is_active: raw.is_active ?? !raw.superseded_at,
    indicators: (firstValue(raw.indicators, raw.items) ?? []).map((/** @type {any} */ i) => ({
      code: firstValue(i.code, i.indicator_code),
      weight: i.weight,
      target: i.target,
    })),
    dimensions: (raw.dimensions ?? []).map((/** @type {any} */ d) => ({
      code: firstValue(d.code, d.dimension_code),
      weight: d.weight,
    })),
    levels: raw.levels ?? [],
  };
}

export const ruleSchema = z.preprocess(
  (raw) => (isRecord(raw) ? normaliseRule(raw) : raw),
  z.object({
    id: z.coerce.string(),
    vendor_id: z.coerce.string(),
    vendor_name: optionalText,
    site_id: z.coerce.string().nullable().catch(null),
    site_name: optionalText,
    period_type: z.coerce.string().catch('MONTH'),
    version: optionalNumber,
    created_by_name: optionalText,
    created_at: optionalText,
    superseded_at: optionalText,
    is_active: z.boolean().catch(true),
    indicators: z
      .array(z.object({ code: z.coerce.string(), weight: number, target: optionalNumber }))
      .catch([]),
    dimensions: z.array(z.object({ code: z.coerce.string(), weight: number })).catch([]),
    levels: z.array(levelSchema).catch([]),
  }),
);

/** @typedef {z.infer<typeof ruleSchema>} Rule */
/** @typedef {import('@/features/sla-shared/catalog-schemas').CatalogItem} CatalogItem */
/** @typedef {import('@/features/sla-shared/catalog-schemas').LevelRequirement} LevelRequirement */

export const ruleListSchema = listResponseSchema(ruleSchema);

export const ruleDetailSchema = entityResponseSchema(ruleSchema, [
  'rule',
  'sla_rule',
  'maturity_rule',
]);
