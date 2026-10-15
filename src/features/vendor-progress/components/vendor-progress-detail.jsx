'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { NotFoundState } from '@/components/shared/not-found-state';
import { useVendorProgressDetail } from '@/features/vendor-progress/api/queries';
import {
  AreaProgressList,
  findingsOf,
} from '@/features/vendor-progress/components/area-progress-list';
import { ProgressBar } from '@/features/vendor-progress/components/progress-bar';
import { ProgressPeriodFilter } from '@/features/vendor-progress/components/progress-period-filter';
import { periodText } from '@/features/vendor-progress/components/vendor-progress-list';
import {
  useProgressFilters,
  useSiteNames,
} from '@/features/vendor-progress/hooks/use-progress-filters';

/**
 * `/vendor-progress/[vendorId]` — one vendor's progress for the period: task counts, set-up
 * (areas, points, workers, assignments) and the progress per area.
 * @param {{ vendorId: string }} props
 */
export function VendorProgressDetail({ vendorId }) {
  const { setParams, today, range, siteId, search } = useProgressFilters();
  const query = useVendorProgressDetail({
    dates: range.dates,
    site_id: siteId,
    vendor_id: vendorId,
  });
  const siteNameOf = useSiteNames(siteId);
  const backHref = `/vendor-progress${search ? `?${search}` : ''}`;
  const rows = query.data?.data.filter((row) => row.vendorId === vendorId) ?? [];
  const vendor = rows[0];

  const header = (
    <div className="mb-5 flex flex-col gap-4">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Kembali ke progress vendor
      </Link>
      <ProgressPeriodFilter range={range} today={today} onChange={setParams} />
    </div>
  );

  if (range.error) return header;
  if (query.isPending) {
    return (
      <>
        {header}
        <ListSkeleton rows={3} />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        {header}
        <ErrorState onRetry={() => query.refetch()} />
      </>
    );
  }
  if (!vendor) {
    return (
      <>
        <PageHeader title="Progress vendor" />
        {header}
        <NotFoundState
          title="Progres tidak ditemukan"
          description="Vendor ini tidak punya task pada periode ini, atau di luar akses Anda."
        />
      </>
    );
  }

  const name = vendor.vendorName ?? 'Vendor';
  const stats = [
    ['Total task', vendor.total],
    ['Selesai', vendor.completed],
    ['Dikerjakan', vendor.inProgress],
    ['Belum mulai', vendor.notStarted],
  ];
  const facts = [
    ['Site', rows.map(siteNameOf).join(', ')],
    ['Periode', periodText(range)],
    ['Total area', vendor.totals.areas],
    ['Total point', vendor.totals.points],
    ['Total worker', vendor.totals.workers],
    ['Total penugasan', vendor.totals.assignments],
    ['Temuan safety', vendor.areas.reduce((sum, area) => sum + findingsOf(area), 0)],
  ];

  return (
    <>
      <PageHeader title={name} description={periodText(range)} />
      {header}

      <section className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-xl font-semibold text-foreground md:sr-only">{name}</p>
          <ProgressBar percent={vendor.percent} label={`Progres ${name}`} />
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/50 p-3">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-2xl font-semibold text-foreground tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <dl className="grid min-w-0 gap-x-6 gap-y-4 sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="font-medium break-words text-foreground tabular-nums">
                {value || '—'}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="area-title" className="mt-6">
        <h2 id="area-title" className="mb-3 text-lg font-semibold text-foreground">
          Progres per area
        </h2>
        <AreaProgressList areas={vendor.areas} />
      </section>
    </>
  );
}
