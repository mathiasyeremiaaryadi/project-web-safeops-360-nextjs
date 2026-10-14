import { z } from 'zod';
import {
  entityResponseSchema,
  enumTextSchema,
  firstValue,
  listResponseSchema,
} from '@/lib/api/lists';

/*
 * `/inventory-reports` (BRD 8.5): vendor, optional inventory, reporter, type, evidence key,
 * description, review status/reason. JSON names are read from their likely variants —
 * docs/ASSUMPTIONS.md IR1.
 */

const optionalText = z.coerce.string().nullish().catch(null);

export const inventoryReportSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const r = /** @type {any} */ (raw);
    return {
      ...r,
      vendor_id: firstValue(r.vendor_id, r.vendor?.id),
      inventory_id: firstValue(r.inventory_id, r.inventory?.id),
      inventory_name: firstValue(r.inventory_item, r.inventory_name, r.inventory?.item),
      user_id: firstValue(r.user_id, r.reporter_id, r.user?.id),
      reporter_name: firstValue(
        r.user_full_name,
        r.reporter_name,
        r.user?.full_name,
        r.user?.username,
      ),
      report_type: firstValue(r.report_type, r.type),
      evidence_url: firstValue(r.evidence_url, r.evidence, r.evidence_key, r.image_url),
      reported_at: firstValue(r.created_at, r.reported_at, r.submitted_at),
    };
  },
  z.object({
    id: z.coerce.string(),
    vendor_id: optionalText,
    inventory_id: optionalText,
    inventory_name: optionalText,
    user_id: optionalText,
    reporter_name: optionalText,
    report_type: enumTextSchema(),
    description: optionalText,
    evidence_url: optionalText,
    status: enumTextSchema(),
    review_reason: optionalText,
    reported_at: optionalText,
  }),
);

/** @typedef {z.infer<typeof inventoryReportSchema>} InventoryReport */

export const inventoryReportListSchema = listResponseSchema(inventoryReportSchema);

export const inventoryReportDetailSchema = entityResponseSchema(inventoryReportSchema, [
  'inventory_report',
  'report',
]);
