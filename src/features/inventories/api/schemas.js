import { z } from 'zod';
import {
  entityResponseSchema,
  listResponseSchema,
  masterStatusSchema,
  withMasterStatus,
} from '@/lib/api/lists';
import { INVENTORY_CONDITION } from '@/features/inventories/lib/constants';

/* `/inventories` (BRD 8.4). Response field names are assumptions — docs/ASSUMPTIONS.md (INV1–INV3). */

export const inventorySchema = z.preprocess(
  withMasterStatus,
  z.object({
    id: z.coerce.string(),
    vendor_id: z.coerce.string(),
    item: z.string(),
    jenis_item: z.string().nullish(),
    qty: z.coerce.number().catch(0),
    /** Kept as text: an unknown value is shown as-is instead of failing the whole list. */
    status_condition: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
      z.string().catch(''),
    ),
    status: masterStatusSchema,
    /** Signed URL; the detail sends it, the list may too. */
    image_url: z.string().nullish(),
    updated_at: z.string().nullish(),
  }),
);

/** @typedef {z.infer<typeof inventorySchema>} Inventory */

export const inventoryListSchema = listResponseSchema(inventorySchema);

export const inventoryDetailSchema = entityResponseSchema(inventorySchema, 'inventory');

const optionSchema = z.object({ value: z.string(), label: z.string() });

export const inventoryFormSchema = z.object({
  vendor: optionSchema.nullable().refine(Boolean, 'Vendor wajib dipilih.'),
  item: z.string().trim().min(1, 'Nama item wajib diisi.').max(120),
  jenis_item: z.string().trim().min(1, 'Jenis item wajib diisi.').max(80),
  qty: z.string().trim().regex(/^\d+$/, 'Jumlah harus bilangan bulat 0 atau lebih.'),
  status_condition: z.enum(Object.values(INVENTORY_CONDITION), 'Kondisi wajib dipilih.'),
  /** New photo (already validated by FileField); `null` keeps the current one. */
  image: z.any().nullable(),
});

/** @typedef {z.infer<typeof inventoryFormSchema>} InventoryFormValues */

/**
 * Multipart fields of `POST /inventories` and `PATCH /inventories/{id}`.
 * @param {InventoryFormValues} values
 */
export const toInventoryFields = (values) => ({
  vendor_id: values.vendor?.value,
  item: values.item,
  jenis_item: values.jenis_item,
  qty: Number(values.qty),
  status_condition: values.status_condition,
  image: values.image ?? undefined,
});
