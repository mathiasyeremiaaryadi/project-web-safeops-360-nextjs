import { z } from 'zod';
import { listResponseSchema, masterStatusSchema } from '@/lib/api/lists';

/** `/sites` row (BRD 8.3). */
export const siteSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  site_type: z.string().nullish(),
  status: masterStatusSchema,
});

/** @typedef {z.infer<typeof siteSchema>} Site */

export const siteListSchema = listResponseSchema(siteSchema);

export const siteFormSchema = z.object({
  code: z.string().trim().min(1, 'Kode wajib diisi.').max(30),
  name: z.string().trim().min(1, 'Nama site wajib diisi.').max(120),
  site_type: z.string().trim().max(60),
});

/** @param {z.infer<typeof siteFormSchema>} values */
export const toSitePayload = (values) => ({
  code: values.code,
  name: values.name,
  site_type: values.site_type || null,
});
