import { z } from 'zod';
import {
  idListSchema,
  listResponseSchema,
  masterStatusSchema,
  withMasterStatus,
} from '@/lib/api/lists';

/** `/vendors` row (BRD 8.3). The list includes `site_ids`. */
export const vendorSchema = z.preprocess(
  (raw) => {
    const row = /** @type {any} */ (withMasterStatus(raw));
    // Sites may come as `site_ids: [id]` or `sites: [{ id, ... }]`.
    return row && typeof row === 'object' ? { ...row, site_ids: row.site_ids ?? row.sites } : row;
  },
  z.object({
    id: z.coerce.string(),
    code: z.coerce.string().catch(''),
    name: z.string(),
    site_ids: idListSchema,
    status: masterStatusSchema,
  }),
);

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
