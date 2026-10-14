import { z } from 'zod';

/**
 * Schema of every paginated list: `{ data: [], page, limit, total }` (BRD 8.5).
 * `page`/`limit`/`total` default when an endpoint omits them (e.g. audit logs).
 * @template {z.ZodType} T
 * @param {T} item
 */
export function listResponseSchema(item) {
  return z.object({
    data: z.array(item),
    page: z.number().int().positive().catch(1),
    limit: z.number().int().positive().catch(20),
    total: z.number().int().nonnegative().optional(),
  });
}

/** Master-data status. */
export const masterStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
