import { z } from 'zod';
import { firstValue, listResponseSchema } from '@/lib/api/lists';

/*
 * `/assignments` (Postman): a WORKER assigned to a pipeline item (task). The shift is chosen by
 * the worker per report, not here. Names may be embedded in several ways — ASSUMPTIONS AS1.
 */

const optionalText = z.coerce.string().nullish().catch(null);

export const assignmentSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const r = /** @type {any} */ (raw);
    const item = r.pipeline_item ?? {};
    const pipeline = item.pipeline ?? r.pipeline ?? {};
    return {
      id: r.id,
      user_id: firstValue(r.user_id, r.user?.id, r.worker_id),
      worker_name: firstValue(
        r.user_full_name,
        r.worker_name,
        r.full_name,
        r.user?.full_name,
        r.user?.username,
      ),
      pipeline_item_id: firstValue(r.pipeline_item_id, item.id),
      task_name: firstValue(r.item_name, r.task_name, item.item?.name, item.name),
      pipeline_id: firstValue(r.pipeline_id, pipeline.id),
      pipeline_name: firstValue(r.pipeline_name, pipeline.name),
      site_name: firstValue(r.site_name, pipeline.site?.name),
      is_active: firstValue(r.is_active, r.active) ?? true,
      created_at: firstValue(r.created_at, r.assigned_at),
    };
  },
  z.object({
    id: z.coerce.string(),
    user_id: optionalText,
    worker_name: optionalText,
    pipeline_item_id: optionalText,
    task_name: optionalText,
    pipeline_id: optionalText,
    pipeline_name: optionalText,
    site_name: optionalText,
    is_active: z.boolean().catch(true),
    created_at: optionalText,
  }),
);

/** @typedef {z.infer<typeof assignmentSchema>} Assignment */

export const assignmentListSchema = listResponseSchema(assignmentSchema);

const optionSchema = z.object({ value: z.string(), label: z.string() });

/** "Tambah penugasan": pipeline → one of its tasks → a worker of the vendor. */
export const assignmentFormSchema = z.object({
  pipeline: optionSchema.nullable().refine(Boolean, 'Pipeline wajib dipilih.'),
  pipeline_item_id: z.string().min(1, 'Task wajib dipilih.'),
  worker: optionSchema.nullable().refine(Boolean, 'Worker wajib dipilih.'),
});

/** @param {z.infer<typeof assignmentFormSchema>} values */
export const toAssignmentPayload = (values) => ({
  pipeline_item_id: values.pipeline_item_id,
  user_id: values.worker?.value,
});
