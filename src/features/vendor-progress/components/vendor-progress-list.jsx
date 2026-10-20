'use client';

import { PageHeader } from '@/components/layout/page-header';
import { FilterBar } from '@/components/shared/filter-bar';
import { QueryList } from '@/components/shared/query-list';
import { ReportFilters } from '@/components/shared/report-filters';
import { useVendorProgress } from '@/features/vendor-progress/api/queries';
import { ProgressBar } from '@/features/vendor-progress/components/progress-bar';
import { ProgressDateFilter } from '@/features/vendor-progress/components/progress-date-filter';
import {
  useProgressFilters,
  useSiteNames,
} from '@/features/vendor-progress/hooks/use-progress-filters';
import { searchRows } from '@/lib/search';
import { BarChart3, CheckCircle2, CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/** @typedef {import('@/features/vendor-progress/lib/progress').VendorProgress} VendorProgress */

/** @param {number} value */
const count = (value) => (
  <span className="block w-full text-center tabular-nums">{value ?? 0}</span>
);

/**
 * Persentase progres berdasarkan completed / total_task.
 *
 * @param {Pick<VendorProgress, 'completed' | 'total'>} row
 */
const getProgressPercent = (row) => {
  const totalTask = Number(row.total) || 0;
  const completed = Number(row.completed) || 0;

  if (totalTask <= 0) return 0;

  return Math.round((completed / totalTask) * 10000) / 100;
};

/**
 * Status checkpoint dari API:
 * status_check_point: COMPLETE | INCOMPLETE
 *
 * @param {{ status: string | null | undefined }} props
 */
const CheckPointStatus = ({ status }) => {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase();

  if (!normalized) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        Status belum tersedia
      </span>
    );
  }

  const isComplete = normalized === 'COMPLETE';

  return (
    <span
      className={[
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-xs leading-none font-semibold',
        isComplete
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
      ].join(' ')}
    >
      {isComplete ? (
        <CheckCircle2 aria-hidden="true" className="size-3.5" />
      ) : (
        <CircleAlert aria-hidden="true" className="size-3.5" />
      )}
      {isComplete ? 'Complete' : 'Incomplete'}
    </span>
  );
};

/**
 * Ringkasan checkpoint: Area dan Point.
 *
 * @param {{ row: VendorProgress }} props
 */
const CheckPointCell = ({ row }) => (
  <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
    <span className="whitespace-nowrap text-muted-foreground">
      Area:{' '}
      <span className="font-semibold text-foreground tabular-nums">{row.totals.areas ?? 0}</span>
    </span>

    <span className="text-muted-foreground" aria-hidden="true">
      ·
    </span>

    <span className="whitespace-nowrap text-muted-foreground">
      Point:{' '}
      <span className="font-semibold text-foreground tabular-nums">{row.totals.points ?? 0}</span>
    </span>
  </div>
);

/** `/vendor-progress` — task progress per vendor for one day. */
export function VendorProgressList() {
  const router = useRouter();
  const { params, setParams, today, date, site, siteId, search } = useProgressFilters();

  const query = useVendorProgress({
    date,
    site_id: siteId,
    vendor_id: params.vendor_id || undefined,
  });

  const siteNameOf = useSiteNames(siteId);

  /** @param {VendorProgress} row */
  const nameOf = (row) => row.vendorName ?? '—';

  const rows = query.data
    ? searchRows(query.data.data, params.q, (row) => [nameOf(row), siteNameOf(row)])
    : [];

  /**
   * Rows are per vendor and site. Carry the row's site to the detail page.
   *
   * @param {VendorProgress} row
   */
  const hrefOf = (row) => {
    const queryParams = new URLSearchParams(search);

    if (row.siteId) {
      queryParams.set('site_id', row.siteId);
    }

    const text = queryParams.toString();

    return `/vendor-progress/${row.vendorId}${text ? `?${text}` : ''}`;
  };

  const centeredCellClass = 'text-center [&>div]:justify-center';

  const columns = [
    {
      id: 'vendor',
      header: 'Vendor',
      meta: {
        sortValue: (/** @type {VendorProgress} */ row) => `${siteNameOf(row)} ${nameOf(row)}`,
      },
      cell: ({ row }) => (
        <span className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{siteNameOf(row.original)}</span>
          <span className="font-semibold text-foreground">{nameOf(row.original)}</span>
        </span>
      ),
    },
    {
      id: 'progress',
      header: 'Progres',
      meta: {
        sortValue: (/** @type {VendorProgress} */ row) => getProgressPercent(row),
      },
      cell: ({ row }) => (
        <ProgressBar
          percent={getProgressPercent(row.original)}
          label={`Progres ${nameOf(row.original)}`}
        />
      ),
    },
    {
      id: 'total',
      header: 'Total task',
      meta: {
        className: centeredCellClass,
        sortValue: (/** @type {VendorProgress} */ row) => row.total,
      },
      cell: ({ row }) => count(row.original.total),
    },
    {
      id: 'completed',
      header: 'Completed',
      meta: {
        className: centeredCellClass,
        sortValue: (/** @type {VendorProgress} */ row) => row.completed,
      },
      cell: ({ row }) => count(row.original.completed),
    },
    {
      id: 'in_progress',
      header: 'In-Progress',
      meta: {
        hideBelow: 'lg',
        className: centeredCellClass,
        sortValue: (/** @type {VendorProgress} */ row) => row.inProgress,
      },
      cell: ({ row }) => count(row.original.inProgress),
    },
    {
      id: 'not_started',
      header: 'Pending',
      meta: {
        hideBelow: 'lg',
        className: centeredCellClass,
        sortValue: (/** @type {VendorProgress} */ row) => row.notStarted,
      },
      cell: ({ row }) => count(row.original.notStarted),
    },
    {
      id: 'check_point',
      header: 'Check Point',
      meta: {
        sortValue: (/** @type {VendorProgress} */ row) => row.totals.areas + row.totals.points,
      },
      cell: ({ row }) => <CheckPointCell row={row.original} />,
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        sortValue: (/** @type {VendorProgress} */ row) => row.statusCheckPoint ?? '',
      },
      cell: ({ row }) => <CheckPointStatus status={row.original.statusCheckPoint} />,
    },
  ];

  return (
    <>
      <PageHeader title="Progress vendor" description={`Progres task per vendor · ${date}`} />

      <FilterBar
        className="mb-3"
        search={params.q}
        onSearchChange={(q) => setParams({ q: q || null })}
        searchPlaceholder="Cari site atau vendor"
      />

      <ReportFilters
        params={{ ...params, site_id: siteId ?? '' }}
        showSite={site.showSiteFilter}
        showVendor={site.showVendorFilter}
        onChange={(updates) =>
          setParams(
            'site_id' in updates
              ? {
                  site_id: updates.site_id || null,
                  vendor_id: null,
                }
              : {
                  vendor_id: updates.vendor_id || null,
                },
          )
        }
      >
        <ProgressDateFilter date={date} today={today} onChange={setParams} />
      </ReportFilters>

      <QueryList
        query={query}
        rows={rows}
        empty={{
          icon: BarChart3,
          title: 'Belum ada progres',
          description: 'Tidak ada task vendor pada tanggal dan filter ini.',
        }}
        noun="vendor"
        onPageChange={() => {}}
        columns={columns}
        getRowId={(row) => `${row.vendorId}-${row.siteId ?? ''}`}
        caption="Progress vendor"
        cardGridClassName="sm:grid-cols-2"
        onRowClick={(row) => router.push(hrefOf(row))}
        renderCard={(row) => (
          <Link
            href={hrefOf(row)}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex flex-col gap-1">
              <span className="font-semibold text-foreground">{nameOf(row)}</span>
              <span className="text-sm text-muted-foreground">{siteNameOf(row)}</span>
            </span>

            <ProgressBar percent={getProgressPercent(row)} label={`Progres ${nameOf(row)}`} />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Selesai', row.completed],
                ['Dikerjakan', row.inProgress],
                ['Belum mulai', row.notStarted],
                ['Total task', row.total],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted/50 px-2 py-2 text-center">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-foreground tabular-nums">
                    {value ?? 0}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t pt-3">
              <span className="text-sm font-semibold text-foreground">Check Point</span>
              <CheckPointCell row={row} />
            </div>

            <div className="flex flex-col items-start gap-2 border-t pt-3">
              <span className="text-sm font-semibold text-foreground">Status</span>
              <CheckPointStatus status={row.statusCheckPoint} />
            </div>
          </Link>
        )}
      />
    </>
  );
}
