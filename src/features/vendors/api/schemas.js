import { z } from 'zod';
import { listResponseSchema, masterStatusSchema } from '@/lib/api/lists';

/** `/vendors` row (BRD 8.3). The list includes `site_ids`. */
export const vendorSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  site_ids: z.array(z.string()).catch([]),
  status: masterStatusSchema,
});

/** @typedef {z.infer<typeof vendorSchema>} Vendor */

export const vendorListSchema = listResponseSchema(vendorSchema);

const optionSchema = z.object({ value: z.string(), label: z.string() });

export const vendorFormSchema = z.object({
  code: z.string().trim().min(1, 'Kode wajib diisi.').max(30),
  name: z.string().trim().min(1, 'Nama vendor wajib diisi.').max(120),
  sites: z.array(optionSchema),
});

/** Sites are sent as `site_ids` (many-to-many). @param {z.infer<typeof vendorFormSchema>} values */
export const toVendorPayload = (values) => ({
  code: values.code,
  name: values.name,
  site_ids: values.sites.map((site) => site.value),
});
