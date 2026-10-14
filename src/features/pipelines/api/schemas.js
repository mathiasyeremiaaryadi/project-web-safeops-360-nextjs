import { z } from 'zod';
import { listResponseSchema, masterStatusSchema, withMasterStatus } from '@/lib/api/lists';

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

export const pipelineItemSchema = z.preprocess(
  withMasterStatus,
  z.object({
    id: z.coerce.string(),
    item_id: z.coerce.string(),
    sort_order: z.number(),
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

export const pipelineFormSchema = z.object({
  vendor: optionSchema.nullable().refine(Boolean, 'Vendor wajib dipilih.'),
  name: z.string().trim().min(1, 'Nama pipeline wajib diisi.').max(120),
  description: z.string().trim().max(500),
});

/**
 * @param {z.infer<typeof pipelineFormSchema>} values
 * @param {boolean} isNew The vendor is only sent when creating.
 */
export const toPipelinePayload = (values, isNew) => ({
  ...(isNew ? { vendor_id: values.vendor?.value } : {}),
  name: values.name,
  description: values.description || undefined,
});
