import { describe, expect, it } from 'vitest';
import { auditLogListSchema } from '@/features/audit-logs/api/schemas';

const base = { id: 1, action: 'LOGIN', created_at: '2026-10-14T01:00:00Z' };

describe('auditLogSchema actor', () => {
  it('reads the actor from flat or embedded fields', () => {
    const { data } = auditLogListSchema.parse({
      data: [
        { ...base, user_id: 7, actor_full_name: 'Budi Santoso', actor_username: 'budi' },
        { ...base, id: 2, actor: { id: 'u2', full_name: 'Siti Rahma', username: 'siti' } },
        { ...base, id: 3, actor_id: 'u3' },
      ],
    });
    expect(data.map((l) => [l.actor_id, l.actor_name, l.actor_username])).toEqual([
      ['7', 'Budi Santoso', 'budi'],
      ['u2', 'Siti Rahma', 'siti'],
      ['u3', undefined, undefined],
    ]);
  });
});
