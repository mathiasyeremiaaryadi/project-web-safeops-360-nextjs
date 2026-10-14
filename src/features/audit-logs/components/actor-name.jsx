'use client';

import { useOptionLabels } from '@/hooks/use-option-labels';
import { UNKNOWN_ACTOR } from '@/features/audit-logs/constants';

/** @typedef {import('@/features/audit-logs/api/schemas').AuditLog} AuditLog */

/**
 * Name of the user who did an action: the name sent with the log, else looked up from the user
 * list by id, else the username. Shared by the cell, the search and the sort of the "User" column.
 * @returns {(log: AuditLog) => string}
 */
export function useActorName() {
  const users = useOptionLabels('users');
  return (log) => {
    const lookedUp = log.actor_id ? users.labelOf(log.actor_id) : '—';
    return (
      log.actor_name || (lookedUp !== '—' ? lookedUp : null) || log.actor_username || UNKNOWN_ACTOR
    );
  };
}

/**
 * Actor name, with the username under it when known.
 * @param {{ log: AuditLog, name: string, inline?: boolean }} props `name` from `useActorName`.
 */
export function ActorName({ log, name, inline = false }) {
  const username =
    log.actor_username && log.actor_username !== name ? `@${log.actor_username}` : null;

  if (inline) return <>{name}</>;
  return (
    <span className="flex min-w-0 flex-col font-sans">
      <span className="font-medium text-foreground">{name}</span>
      {username ? <span className="text-xs text-muted-foreground">{username}</span> : null}
    </span>
  );
}
