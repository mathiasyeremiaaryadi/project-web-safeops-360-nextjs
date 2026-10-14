'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/list-states';
import { cn } from '@/lib/utils';

/**
 * @param {object} props
 * @param {string} props.label
 * @param {number | null} props.value `null` = not sent by the API.
 * @param {string} [props.hint]
 * @param {string} [props.valueClassName]
 */
function KpiCard({ label, value, hint, valueClassName }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4 sm:p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-3xl font-bold text-foreground tabular-nums', valueClassName)}>
        {value ?? '—'}
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/**
 * Task hari ini · Selesai · Menunggu review · Revisi diminta. 2×2 below 768px, 4 columns from 768px.
 * @param {object} props
 * @param {import('@tanstack/react-query').UseQueryResult<import('@/features/dashboard/lib/summary').DashboardKpis>} props.query
 * @param {number | null} props.vendorCount Vendors in "Progres per vendor" (hint under the total).
 */
export function KpiCards({ query, vendorCount }) {
  if (query.isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const kpis = query.data;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard
        label="Task hari ini"
        value={kpis.total}
        hint={vendorCount ? `${vendorCount} vendor` : undefined}
      />
      <KpiCard label="Selesai" value={kpis.completed} valueClassName="text-success" />
      <KpiCard label="Menunggu review" value={kpis.submitted} valueClassName="text-warning" />
      <KpiCard
        label="Revisi diminta"
        value={kpis.revision}
        valueClassName="text-revision"
        hint={kpis.notStarted === null ? undefined : `Belum dikerjakan: ${kpis.notStarted}`}
      />
    </div>
  );
}
