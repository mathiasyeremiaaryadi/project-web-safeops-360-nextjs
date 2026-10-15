import { z } from 'zod';
import {
  entityResponseSchema,
  listResponseSchema,
  masterStatusSchema,
  withMasterStatus,
} from '@/lib/api/lists';

/*
 * `/pipelines`, `/pipelines/{id}/items`, `/pipeline-items/{id}` (BRD 8.4).
 * Response fields are assumptions — docs/ASSUMPTIONS.md (P1–P3).
 */

export const pipelineSchema = z.preprocess(
  withMasterStatus,
  z.object({
    id: z.coerce.string(),
    vendor_id: z.coerce.string(),
    name: z.string(),
    description: z.string().nullish(),
    status: masterStatusSchema,
    /** Number of tasks, if the list sends it. */
    item_count: z.number().nullish(),
  }),
);

/** @typedef {z.infer<typeof pipelineSchema>} Pipeline */

export const pipelineListSchema = listResponseSchema(pipelineSchema);

/** `GET /pipelines/{id}` (bare or wrapped in `pipeline` / `data`). */
export const pipelineDetailSchema = entityResponseSchema(pipelineSchema, 'pipeline');

export const pipelineItemSchema = z.preprocess(
  (raw) => {
    const row = /** @type {any} */ (withMasterStatus(raw));
    // The task may only be embedded as `item: { id, name }`.
    return row && typeof row === 'object' ? { ...row, item_id: row.item_id ?? row.item?.id } : row;
  },
  z.object({
    id: z.coerce.string(),
    item_id: z.coerce.string(),
    sort_order: z.coerce.number().catch(0),
    status: masterStatusSchema,
    /** Task name, if the API embeds it (`item_name` or `item.name`). */
    item_name: z.string().nullish(),
    item: z.object({ name: z.string() }).partial().nullish(),
  }),
);

/** @typedef {z.infer<typeof pipelineItemSchema>} PipelineItem */

/** Accepts a plain array or any list envelope (see lib/api/lists.js). */
export const pipelineItemListSchema = listResponseSchema(pipelineItemSchema);

const optionSchema = z.object({ value: z.string(), label: z.string() });

/** Site and vendor are only chosen when creating (a pipeline keeps its vendor). */
export const pipelineFormSchema = z
  .object({
    isNew: z.boolean(),
    site: optionSchema.nullable(),
    vendor: optionSchema.nullable().refine(Boolean, 'Vendor wajib dipilih.'),
    name: z.string().trim().min(1, 'Nama pipeline wajib diisi.').max(120),
    description: z.string().trim().max(500),
  })
  .superRefine((values, ctx) => {
    if (values.isNew && !values.site) {
      ctx.addIssue({ code: 'custom', path: ['site'], message: 'Site wajib dipilih.' });
    }
  });

/**
 * Body of `POST /pipelines` (with `site_id` and `vendor_id`) or `PATCH /pipelines/{id}`.
 * `site_id` is not in the BRD columns — docs/ASSUMPTIONS.md P4.
 * @param {z.infer<typeof pipelineFormSchema>} values
 */
export const toPipelinePayload = (values) => ({
  ...(values.isNew ? { site_id: values.site?.value, vendor_id: values.vendor?.value } : {}),
  name: values.name,
  description: values.description || undefined,
});
