'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatDateTime } from '@/lib/date';
import { ActionBadge } from '@/features/audit-logs/components/action-badge';
import { ActorName, useActorName } from '@/features/audit-logs/components/actor-name';

/**
 * Pretty-printed JSON, rendered as TEXT inside <pre> (never as HTML).
 * @param {unknown} value
 */
function toPrettyJson(value) {
  if (value === undefined || value === null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** @param {{ label: string, children: import('react').ReactNode }} props */
function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-mono break-all text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Read-only detail of one audit entry.
 * @param {{ log: import('@/features/audit-logs/api/schemas').AuditLog | null, onClose: () => void }} props
 */
export function AuditLogDetailSheet({ log, onClose }) {
  const actorName = useActorName();
  return (
    <Sheet
      open={Boolean(log)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Detail aktivitas {log ? <ActionBadge action={log.action} /> : null}
          </SheetTitle>
          <SheetDescription>{log?.summary || '—'}</SheetDescription>
        </SheetHeader>
        {log ? (
          <div className="flex flex-col gap-4 px-4 pb-6">
            <dl>
              <Row label="Waktu">{formatDateTime(log.created_at)}</Row>
              <Row label="Pelaku">
                <ActorName log={log} name={actorName(log)} />
              </Row>
              <Row label="Entitas">{log.entity || '—'}</Row>
              <Row label="Target">{log.entity_id || '—'}</Row>
              <Row label="IP">{log.ip || '—'}</Row>
            </dl>
            <section>
              <h3 className="text-sm font-semibold text-danger">Sebelum</h3>
              <pre className="mt-1.5 overflow-x-auto rounded-lg bg-danger-bg p-3 text-xs text-foreground">
                {toPrettyJson(log.before)}
              </pre>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-success">Sesudah</h3>
              <pre className="mt-1.5 overflow-x-auto rounded-lg bg-success-bg p-3 text-xs text-foreground">
                {toPrettyJson(log.after)}
              </pre>
            </section>
            <p className="text-xs text-muted-foreground">
              Password dan token tidak pernah dicatat di audit log.
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
