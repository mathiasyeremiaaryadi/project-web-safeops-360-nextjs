import { z } from 'zod';

/** Report types, in the order of the radio cards. */
export const REPORT_TYPE_OPTIONS = Object.freeze([
  {
    value: 'REQUEST',
    label: 'Permintaan',
    description: 'Butuh perlengkapan baru atau tambahan',
  },
  {
    value: 'DAMAGED',
    label: 'Kerusakan',
    description: 'Perlengkapan rusak atau tidak bisa dipakai',
  },
]);

/** "Lapor inventory" form. The inventory is required for a damage report only. */
export const inventoryReportFormSchema = z
  .object({
    report_type: z.enum(['REQUEST', 'DAMAGED'], 'Jenis laporan wajib dipilih.'),
    inventory_id: z.string(),
    description: z.string().trim().min(1, 'Keterangan wajib diisi.').max(1000),
  })
  .superRefine((values, ctx) => {
    if (values.report_type === 'DAMAGED' && !values.inventory_id) {
      ctx.addIssue({
        code: 'custom',
        path: ['inventory_id'],
        message: 'Pilih inventory yang rusak.',
      });
    }
  });

/** @typedef {z.infer<typeof inventoryReportFormSchema>} InventoryReportFormValues */

export const EMPTY_INVENTORY_REPORT = Object.freeze({
  report_type: /** @type {any} */ (undefined),
  inventory_id: '',
  description: '',
});

/**
 * JSON body of `POST /inventory-reports` (without the vendor: added by `withOwnVendor`).
 * @param {InventoryReportFormValues} values
 */
export const toInventoryReportFields = (values) => ({
  report_type: values.report_type,
  inventory_id: values.inventory_id || undefined,
  description: values.description.trim(),
});
