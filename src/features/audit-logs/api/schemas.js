import { z } from 'zod';
import { listResponseSchema } from '@/lib/api/lists';

/*
 * `GET /audit-logs` row. BRD 9.2: action, entity/id, before/after JSONB, actor, IP, time.
 * Field names are assumed — docs/ASSUMPTIONS.md (AL1).
 */
export const auditLogSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  action: z.string(),
  entity: z.string().nullish(),
  entity_id: z.string().nullish(),
  actor_id: z.string().nullish(),
  actor_username: z.string().nullish(),
  ip: z.string().nullish(),
  summary: z.string().nullish(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  created_at: z.string(),
});

/** @typedef {z.infer<typeof auditLogSchema>} AuditLog */

export const auditLogListSchema = listResponseSchema(auditLogSchema);
