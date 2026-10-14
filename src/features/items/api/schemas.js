import { z } from 'zod';
import { listResponseSchema, masterStatusSchema } from '@/lib/api/lists';

/** `/items` row — shared master task (BRD 8.4). */
export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  status: masterStatusSchema,
});

/** @typedef {z.infer<typeof itemSchema>} Item */

export const itemListSchema = listResponseSchema(itemSchema);

export const itemFormSchema = z.object({
  name: z.string().trim().min(1, 'Nama task wajib diisi.').max(120),
  description: z.string().trim().max(500),
});

/** @param {z.infer<typeof itemFormSchema>} values */
export const toItemPayload = (values) => ({
  name: values.name,
  description: values.description || null,
});
