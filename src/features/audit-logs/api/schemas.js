import { z } from 'zod';
import { firstValue, listResponseSchema } from '@/lib/api/lists';

/*
 * `GET /audit-logs` row. BRD 9.2: action, entity/id, before/after JSONB, actor, IP, time.
 * Field names are assumed — docs/ASSUMPTIONS.md (AL1). The actor may come as `actor_id` /
 * `user_id`, with or without its name, or embedded as `actor` / `user`.
 */

/** @param {any} r */
const normaliseActor = (r) => {
  const actor = r.actor ?? r.user ?? {};
  return {
    ...r,
    actor_id: firstValue(r.actor_id, r.actor_user_id, r.user_id, actor.id),
    actor_name: firstValue(r.actor_full_name, r.actor_name, r.user_full_name, actor.full_name),
    actor_username: firstValue(r.actor_username, r.username, actor.username),
  };
};

const optionalText = z.coerce.string().nullish().catch(null);

export const auditLogSchema = z.preprocess(
  (raw) => (raw && typeof raw === 'object' ? normaliseActor(raw) : raw),
  z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    action: z.string(),
    entity: z.string().nullish(),
    entity_id: optionalText,
    actor_id: optionalText,
    actor_name: optionalText,
    actor_username: optionalText,
    ip: z.string().nullish(),
    summary: z.string().nullish(),
    before: z.unknown().optional(),
    after: z.unknown().optional(),
    created_at: z.string(),
  }),
);

/** @typedef {z.infer<typeof auditLogSchema>} AuditLog */

export const auditLogListSchema = listResponseSchema(auditLogSchema);
