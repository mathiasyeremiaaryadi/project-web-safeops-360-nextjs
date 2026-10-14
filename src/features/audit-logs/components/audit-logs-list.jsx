'use client';

import { useState } from 'react';
import { parseAsString } from 'nuqs';
import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveList } from '@/components/shared/responsive-list';
import { useListParams } from '@/hooks/use-list-params';
import { formatDateTime } from '@/lib/date';
import { useAuditLogs } from '@/features/audit-logs/api/queries';
import { ActionBadge } from '@/features/audit-logs/components/action-badge';
import { AuditLogDetailSheet } from '@/features/audit-logs/components/audit-log-detail-sheet';
import { AuditLogFilters } from '@/features/audit-logs/components/audit-log-filters';
import { UNKNOWN_ACTOR } from '@/features/audit-logs/constants';

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
    user: params.user,
    action: params.action,
    entity: params.entity,
    from: params.from,
    to: params.to,
  });
  const [selected, setSelected] = useState(
    /** @type {import('@/features/audit-logs/api/schemas').AuditLog | null} */ (null),
  );

  const columns = [
    {
      id: 'time',
      header: 'Waktu',
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
      cell: ({ row }) => (
        <span className="font-mono">{row.original.actor_username || UNKNOWN_ACTOR}</span>
      ),
    },
    {
      id: 'action',
      header: 'Aksi',
      cell: ({ row }) => <ActionBadge action={row.original.action} />,
    },
    {
      id: 'entity',
      header: 'Entitas',
      meta: { hideBelow: 'lg' },
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{row.original.entity || '—'}</span>
      ),
    },
    { id: 'summary', header: 'Ringkasan', cell: ({ row }) => summaryOf(row.original) },
    {
      id: 'ip',
      header: 'IP',
      meta: { hideBelow: 'xl' },
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{row.original.ip || '—'}</span>
      ),
    },
  ];

  return (
    <>
      <AuditLogFilters params={params} onChange={setFilters} />

      {query.isPending ? <ListSkeleton /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.isSuccess && query.data.data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada aktivitas"
          description="Tidak ada catatan yang cocok dengan filter."
        />
      ) : null}
      {query.isSuccess && query.data.data.length > 0 ? (
        <ResponsiveList
          data={query.data.data}
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
              <span className="font-mono text-xs text-muted-foreground">
                {log.actor_username || UNKNOWN_ACTOR} · {log.entity || '—'} · {log.ip || '—'}
              </span>
            </button>
          )}
          footer={
            <Pagination
              page={query.data.page}
              limit={query.data.limit}
              total={query.data.total}
              count={query.data.data.length}
              noun="aktivitas"
              onPageChange={setPage}
            />
          }
        />
      ) : null}

      <AuditLogDetailSheet log={selected} onClose={() => setSelected(null)} />
    </>
  );
}
