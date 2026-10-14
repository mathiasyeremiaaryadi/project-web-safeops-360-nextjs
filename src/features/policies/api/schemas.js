import { z } from 'zod';
import { listResponseSchema, masterStatusSchema, withMasterStatus } from '@/lib/api/lists';

/* `/policies` (BRD 8.4). Response field names are assumptions — docs/ASSUMPTIONS.md (SOP1–SOP3). */

export const policySchema = z.preprocess(
  (raw) => {
    const row = /** @type {any} */ (withMasterStatus(raw));
    if (!row || typeof row !== 'object') return row;
    return {
      ...row,
      file_size: row.file_size ?? row.size,
      updated_at: row.updated_at ?? row.created_at,
    };
  },
  z.object({
    id: z.coerce.string(),
    vendor_id: z.coerce.string(),
    name: z.string(),
    status: masterStatusSchema,
    /** Bytes, if the API sends it. */
    file_size: z.coerce.number().nullish().catch(null),
    updated_at: z.string().nullish(),
  }),
);

/** @typedef {z.infer<typeof policySchema>} Policy */

export const policyListSchema = listResponseSchema(policySchema);

/** First string under the usual URL keys of an object. @param {any} object */
const findUrl = (object) =>
  object && typeof object === 'object'
    ? [object.url, object.signed_url, object.file_url, object.download_url].find(
        (value) => typeof value === 'string',
      )
    : undefined;

/**
 * `GET /policies/{id}/file` → signed URL (10 minutes). Accepts a bare string, `{ url }`,
 * `{ signed_url | file_url | download_url }`, or any of these under `data`.
 */
export const policyFileSchema = z.preprocess(
  (raw) =>
    typeof raw === 'string' ? raw : (findUrl(raw) ?? findUrl(/** @type {any} */ (raw)?.data)),
  z.url({ protocol: /^https?$/ }),
);

const optionSchema = z.object({ value: z.string(), label: z.string() });

/** @param {boolean} isNew The PDF is required when uploading a new SOP. */
export const policyFormSchema = (isNew) =>
  z.object({
    vendor: optionSchema.nullable().refine(Boolean, 'Vendor wajib dipilih.'),
    name: z.string().trim().min(1, 'Nama SOP wajib diisi.').max(160),
    /** Validated by FileField (type/size); here only "required". */
    file: z.any().refine((file) => !isNew || Boolean(file), 'File PDF wajib dipilih.'),
  });

/**
 * Multipart fields. The vendor is only sent when creating; the file only when chosen.
 * @param {{ vendor: { value: string } | null, name: string, file: File | null }} values
 * @param {boolean} isNew
 */
export const toPolicyFields = (values, isNew) => ({
  vendor_id: isNew ? values.vendor?.value : undefined,
  name: values.name,
  file: values.file ?? undefined,
});
