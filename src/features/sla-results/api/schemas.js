import { z } from 'zod';
import { firstValue, listResponseSchema } from '@/lib/api/lists';
import { RESULT_STATUS } from '@/features/sla-shared';

/*
 * `/sla-scores[/live]` and `/maturity-levels[/live]` rows (Postman, no response examples). Field
 * names follow the SLA prompt (section 4.2) and their likely variants — docs/ASSUMPTIONS.md SL4.
 * Scores, compliance, N/A and levels are ONLY read here, never computed.
 */

/** @param {unknown} value */
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const optionalNumber = z.coerce.number().nullish().catch(null);
const optionalText = z.coerce.string().nullish().catch(null);
const optionalBoolean = z.boolean().nullish().catch(null);

/** @param {any} i */
const normaliseItem = (i) => ({
  code: firstValue(i.indicator_code, i.dimension_code, i.code),
  actual: i.actual,
  target: i.target,
  score: i.score,
  met: i.met,
  weight: i.weight,
  is_na: i.is_na ?? i.na ?? false,
});

const itemSchema = z.preprocess(
  (raw) => (isRecord(raw) ? normaliseItem(raw) : raw),
  z.object({
    code: z.coerce.string(),
    actual: optionalNumber,
    target: optionalNumber,
    score: optionalNumber,
    met: optionalBoolean,
    weight: optionalNumber,
    is_na: z.boolean().catch(false),
  }),
);

/** @typedef {z.infer<typeof itemSchema>} ResultItem */

/** @param {any} r */
function normaliseResult(r) {
  const score = r.score ?? r.total_score;
  return {
    scope_type: firstValue(r.scope_type, r.scope),
    vendor_id: firstValue(r.vendor_id, r.vendor?.id) ?? null,
    vendor_name: firstValue(r.vendor_name, r.vendor?.name),
    site_id: firstValue(r.site_id, r.site?.id) ?? null,
    site_name: firstValue(r.site_name, r.site?.name),
    worker_id: firstValue(r.worker_id, r.user_id, r.worker?.id) ?? null,
    worker_name: firstValue(r.worker_name, r.worker_full_name, r.worker?.full_name),
    period_type: r.period_type,
    period_start: r.period_start,
    period_end: r.period_end,
    status: r.status ?? (score === null || score === undefined ? RESULT_STATUS.NO_DATA : 'OK'),
    score,
    compliant: firstValue(r.compliant, r.is_compliant, r.met),
    task_count: r.task_count,
    live: r.live ?? false,
    rule_id: firstValue(r.rule_id, r.sla_rule_id, r.maturity_rule_id),
    rule_version: firstValue(r.rule_version, r.version),
    level: r.level,
    items: firstValue(r.items, r.indicators) ?? [],
    dimensions: r.dimensions ?? [],
  };
}

export const resultSchema = z.preprocess(
  (raw) => (isRecord(raw) ? normaliseResult(raw) : raw),
  z.object({
    scope_type: optionalText,
    vendor_id: z.coerce.string().nullable().catch(null),
    vendor_name: optionalText,
    site_id: z.coerce.string().nullable().catch(null),
    site_name: optionalText,
    worker_id: z.coerce.string().nullable().catch(null),
    worker_name: optionalText,
    period_type: optionalText,
    period_start: optionalText,
    period_end: optionalText,
    status: z.preprocess(
      (value) => String(value ?? '').toUpperCase(),
      z.enum(Object.values(RESULT_STATUS)).catch(RESULT_STATUS.NO_DATA),
    ),
    score: optionalNumber,
    compliant: optionalBoolean,
    task_count: optionalNumber,
    live: z.boolean().catch(false),
    rule_id: optionalText,
    rule_version: optionalNumber,
    level: optionalNumber,
    items: z.array(itemSchema).catch([]),
    dimensions: z.array(itemSchema).catch([]),
  }),
);

/** @typedef {z.infer<typeof resultSchema>} Result */

export const resultListSchema = listResponseSchema(resultSchema);
