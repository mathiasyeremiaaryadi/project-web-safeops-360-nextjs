import { z } from 'zod';
import { SITE_TIMEZONES } from '@/lib/date';
import { listResponseSchema, masterStatusSchema, withMasterStatus } from '@/lib/api/lists';

/** `/sites` row (BRD 8.3). */
export const siteSchema = z.preprocess(
  withMasterStatus,
  z.object({
    id: z.coerce.string(),
    code: z.coerce.string().catch(''),
    name: z.string(),
    site_type: z.string().nullish(),
    /** IANA zone of the site's shift hours and report dates. */
    timezone: z.string().nullish().catch(null),
    status: masterStatusSchema,
  }),
);

/** @typedef {z.infer<typeof siteSchema>} Site */

export const siteListSchema = listResponseSchema(siteSchema);

export const siteFormSchema = z.object({
  code: z.string().trim().min(1, 'Kode wajib diisi.').max(30),
  name: z.string().trim().min(1, 'Nama site wajib diisi.').max(120),
  site_type: z.string().trim().max(60),
  timezone: z.enum(
    /** @type {[string, ...string[]]} */ (SITE_TIMEZONES.map((zone) => zone.value)),
    { message: 'Pilih zona waktu.' },
  ),
});

/** @param {z.infer<typeof siteFormSchema>} values */
export const toSitePayload = (values) => ({
  code: values.code,
  name: values.name,
  site_type: values.site_type || undefined,
  timezone: values.timezone,
});
