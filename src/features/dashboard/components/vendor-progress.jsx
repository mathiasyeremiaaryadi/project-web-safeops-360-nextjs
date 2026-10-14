'use client';

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { useOptionLabels } from '@/hooks/use-option-labels';

/** @param {import('@/features/dashboard/lib/summary').VendorProgress} v */
const summaryText = (v) =>
  `${v.tasks} task · ${v.completed} selesai · ${v.submitted} menunggu review · ${v.revision} revisi · ${v.notStarted} belum dikerjakan`;

/**
 * "Progres per vendor": name, % done, progress bar and counts. Numbers only — no chart.
 * @param {{ query: import('@tanstack/react-query').UseQueryResult<import('@/features/dashboard/lib/summary').VendorProgress[]> }} props
 */
export function VendorProgress({ query }) {
  const vendors = useOptionLabels('vendors');

  return (
    <section aria-labelledby="vendor-progress-title" className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="vendor-progress-title" className="text-lg font-semibold text-foreground">
          Progres per vendor
        </h2>
        <Link
          href="/reports/tasks?tab=ALL"
          className="shrink-0 text-sm font-medium whitespace-nowrap text-primary hover:underline"
        >
          Rekap lengkap
        </Link>
      </div>

      {query.isPending ? <ListSkeleton rows={3} /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.isSuccess && query.data.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Belum ada task"
          description="Tidak ada task untuk tanggal dan filter ini."
        />
      ) : null}
      {query.isSuccess && query.data.length > 0 ? (
        <ul className="flex flex-col gap-5">
          {query.data.map((v) => {
            const name = v.vendorName ?? vendors.labelOf(v.vendorId);
            return (
              <li key={v.key} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-foreground">{name}</span>
                  <span className="font-semibold text-foreground tabular-nums">{v.percent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`Progres ${name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={v.percent}
                  className="h-2.5 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${v.percent}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{summaryText(v)}</p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
