'use client';

import { useState } from 'react';
import { parseAsString } from 'nuqs';
import { ClipboardList } from 'lucide-react';
import { FilterBar } from '@/components/shared/filter-bar';
import { QueryList } from '@/components/shared/query-list';
import { useListParams } from '@/hooks/use-list-params';
import { formatDateTime } from '@/lib/date';
import { searchRows } from '@/lib/search';
import { useAuditLogs } from '@/features/audit-logs/api/queries';
import { ActionBadge } from '@/features/audit-logs/components/action-badge';
import { ActorName, useActorName } from '@/features/audit-logs/components/actor-name';
import { AuditLogDetailSheet } from '@/features/audit-logs/components/audit-log-detail-sheet';
import { AuditLogFilters } from '@/features/audit-logs/components/audit-log-filters';

const FILTERS = {
  user: parseAsString.withDefault(''),
  action: parseAsString.withDefault(''),
  entity: parseAsString.withDefault(''),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
};

/** @param {import('@/features/audit-logs/api/schemas').AuditLog} log */
const summaryOf = (log) => log.summary || `${log.action} ${log.entity ?? ''}`.trim();

/** `/audit-logs` body. Read-only: no edit or delete actions exist. */
export function AuditLogsList() {
  const { params, limit, setFilters, setPage } = useListParams(FILTERS);
  const query = useAuditLogs({
    page: params.page,
    limit,
    q: params.q,
    user: params.user,
    action: params.action,
    entity: params.entity,
    from: params.from,
    to: params.to,
  });
  const actorName = useActorName();
  // Server `?q=` + the same search here, in case the backend ignores `q`.
  const rows = query.data
    ? searchRows(query.data.data, params.q, (log) => [
        actorName(log),
        log.actor_username,
        log.action,
        log.entity,
        log.entity_id,
        summaryOf(log),
        log.ip,
      ])
    : [];
  const [selected, setSelected] = useState(
    /** @type {import('@/features/audit-logs/api/schemas').AuditLog | null} */ (null),
  );

  const columns = [
    {
      id: 'time',
      header: 'Waktu',
      meta: { sortValue: (/** @type {any} */ log) => log.created_at },
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(row.original);
          }}
        >
          {formatDateTime(row.original.created_at)}
        </button>
      ),
    },
    {
      id: 'actor',
      header: 'User',
      meta: { sortValue: actorName },
      cell: ({ row }) => <ActorName log={row.original} name={actorName(row.original)} />,
    },
    {
      id: 'action',
      header: 'Aksi',
      meta: { sortValue: (/** @type {any} */ log) => log.action },
      cell: ({ row }) => <ActionBadge action={row.original.action} />,
    },
    {
      id: 'entity',
      header: 'Entitas',
      meta: { hideBelow: 'lg', sortValue: (/** @type {any} */ log) => log.entity },
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{row.original.entity || '—'}</span>
      ),
    },
    {
      id: 'summary',
      header: 'Ringkasan',
      meta: { sortValue: summaryOf },
      cell: ({ row }) => summaryOf(row.original),
    },
    {
      id: 'ip',
      header: 'IP',
      meta: { hideBelow: 'xl', sortValue: (/** @type {any} */ log) => log.ip },
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{row.original.ip || '—'}</span>
      ),
    },
  ];

  return (
    <>
      <FilterBar
        className="mb-3"
        search={params.q}
        onSearchChange={(q) => setFilters({ q })}
        searchPlaceholder="Cari user, aksi, entitas, ringkasan, atau IP"
      />
      <AuditLogFilters params={params} onChange={setFilters} />

      <QueryList
        query={query}
        rows={rows}
        empty={{
          icon: ClipboardList,
          title: 'Belum ada aktivitas',
          description: 'Tidak ada catatan yang cocok dengan filter.',
        }}
        noun="aktivitas"
        onPageChange={setPage}
        columns={columns}
        getRowId={(log) => log.id}
        caption="Audit log"
        onRowClick={setSelected}
        isRowSelected={(log) => log.id === selected?.id}
        renderCard={(log) => (
          <button
            type="button"
            onClick={() => setSelected(log)}
            className="flex w-full flex-col gap-1.5 rounded-2xl border bg-card p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center justify-between gap-2">
              <ActionBadge action={log.action} />
              <span className="text-sm text-muted-foreground">
                {formatDateTime(log.created_at)}
              </span>
            </span>
            <span className="text-foreground">{summaryOf(log)}</span>
            <span className="text-xs text-muted-foreground">
              <ActorName log={log} name={actorName(log)} inline /> · {log.entity || '—'} ·{' '}
              {log.ip || '—'}
            </span>
          </button>
        )}
      />

      <AuditLogDetailSheet log={selected} onClose={() => setSelected(null)} />
    </>
  );
}
