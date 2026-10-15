'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/list-states';
import { cn } from '@/lib/utils';

/**
 * @param {object} props
 * @param {string} props.label
 * @param {number} props.value
 * @param {string} [props.valueClassName]
 */
function KpiCard({ label, value, valueClassName }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border bg-card p-3 sm:p-5">
      <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
      <span
        className={cn(
          'text-2xl font-bold text-foreground tabular-nums sm:text-3xl',
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Total task · Dikerjakan · Pending · Selesai: 2×2 below 768px, four columns from 768px.
 * @param {{ query: import('@tanstack/react-query').UseQueryResult<import('@/features/dashboard/lib/summary').DashboardKpis> }} props
 */
export function KpiCards({ query }) {
  if (query.isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl sm:h-28" />
        ))}
      </div>
    );
  }
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const kpis = query.data;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard label="Total task" value={kpis.total} />
      <KpiCard label="Dikerjakan" value={kpis.inProgress} valueClassName="text-info" />
      <KpiCard label="Pending" value={kpis.pending} valueClassName="text-warning" />
      <KpiCard label="Selesai" value={kpis.completed} valueClassName="text-success" />
    </div>
  );
}
