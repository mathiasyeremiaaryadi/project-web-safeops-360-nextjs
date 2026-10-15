'use client';

import Link from 'next/link';
import { ArrowLeft, MapPinned } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { NotFoundState } from '@/components/shared/not-found-state';
import { ResponsiveList } from '@/components/shared/responsive-list';
import { useVendorProgress } from '@/features/vendor-progress/api/queries';
import { ProgressBar } from '@/features/vendor-progress/components/progress-bar';
import { ProgressPeriodFilter } from '@/features/vendor-progress/components/progress-period-filter';
import { periodText } from '@/features/vendor-progress/components/vendor-progress-list';
import {
  useProgressFilters,
  useSiteNames,
} from '@/features/vendor-progress/hooks/use-progress-filters';

/** @typedef {import('@/features/vendor-progress/lib/progress').AreaProgress} AreaProgress */

/** @param {number} value */
const count = (value) => <span className="tabular-nums">{value}</span>;

const AREA_COLUMNS = [
  {
    id: 'area',
    header: 'Area',
    meta: { sortValue: (/** @type {AreaProgress} */ a) => a.name },
    cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
  },
  {
    id: 'points',
    header: 'Point',
    meta: { sortValue: (/** @type {AreaProgress} */ a) => a.points },
    cell: ({ row }) => count(row.original.points),
  },
  {
    id: 'progress',
    header: 'Progres',
    meta: { sortValue: (/** @type {AreaProgress} */ a) => a.percent },
    cell: ({ row }) => (
      <ProgressBar percent={row.original.percent} label={`Progres ${row.original.name}`} />
    ),
  },
  {
    id: 'completed',
    header: 'Selesai',
    meta: { sortValue: (/** @type {AreaProgress} */ a) => a.completed },
    cell: ({ row }) => count(row.original.completed),
  },
  {
    id: 'total',
    header: 'Total task',
    meta: { hideBelow: 'lg', sortValue: (/** @type {AreaProgress} */ a) => a.total },
    cell: ({ row }) => count(row.original.total),
  },
];

/**
 * `/vendor-progress/[vendorId]` — one vendor's progress for the period: task counts, set-up
 * (areas, points, workers, assignments) and the progress per area.
 * @param {{ vendorId: string }} props
 */
export function VendorProgressDetail({ vendorId }) {
  const { setParams, today, range, siteId, search } = useProgressFilters();
  const query = useVendorProgress({ dates: range.dates, site_id: siteId, vendor_id: vendorId });
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
        {vendor.areas.length === 0 ? (
          <EmptyState icon={MapPinned} title="Belum ada detail area" />
        ) : (
          <ResponsiveList
            data={vendor.areas}
            columns={AREA_COLUMNS}
            getRowId={(area) => area.key}
            caption={`Progres per area ${name}`}
            cardGridClassName="sm:grid-cols-2"
            renderCard={(area) => (
              <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-foreground">{area.name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {area.points} point
                  </span>
                </span>
                <ProgressBar percent={area.percent} label={`Progres ${area.name}`} />
                <span className="text-sm text-muted-foreground tabular-nums">
                  {area.completed} dari {area.total} task selesai
                </span>
              </div>
            )}
          />
        )}
      </section>
    </>
  );
}
