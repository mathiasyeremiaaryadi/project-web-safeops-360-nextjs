'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { FilterBar } from '@/components/shared/filter-bar';
import { QueryList } from '@/components/shared/query-list';
import { ReportFilters } from '@/components/shared/report-filters';
import { formatLongDate } from '@/lib/date';
import { searchRows } from '@/lib/search';
import { useVendorProgress } from '@/features/vendor-progress/api/queries';
import { ProgressBar } from '@/features/vendor-progress/components/progress-bar';
import { ProgressDateFilter } from '@/features/vendor-progress/components/progress-date-filter';
import {
  useProgressFilters,
  useSiteNames,
} from '@/features/vendor-progress/hooks/use-progress-filters';

/** @typedef {import('@/features/vendor-progress/lib/progress').VendorProgress} VendorProgress */

/** "Kamis, 15 Okt 2026" or "13 – 15 Okt 2026"-like period text. @param {{ from: string, to: string }} range */
export const periodText = ({ from, to }) =>
  from === to ? formatLongDate(from) : `${formatLongDate(from)} – ${formatLongDate(to)}`;

/** @param {number} value */
const count = (value) => <span className="tabular-nums">{value}</span>;

/** `/vendor-progress` — task progress per vendor for one day (today by default). */
export function VendorProgressList() {
  const router = useRouter();
  const { params, setParams, today, range, site, siteId, search } = useProgressFilters();
  const query = useVendorProgress({
    dates: range.dates,
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
   * Detail of one row: rows are per vendor and site, so the row's site is carried over.
   * @param {VendorProgress} row
   */
  const hrefOf = (row) => {
    const query = new URLSearchParams(search);
    if (row.siteId) query.set('site_id', row.siteId);
    const text = query.toString();
    return `/vendor-progress/${row.vendorId}${text ? `?${text}` : ''}`;
  };

  const columns = [
    {
      id: 'vendor',
      header: 'Vendor',
      meta: { sortValue: nameOf },
      cell: ({ row }) => <span className="font-semibold">{nameOf(row.original)}</span>,
    },
    {
      id: 'site',
      header: 'Site',
      meta: { sortValue: siteNameOf },
      cell: ({ row }) => <span className="text-muted-foreground">{siteNameOf(row.original)}</span>,
    },
    {
      id: 'progress',
      header: 'Progres',
      meta: { sortValue: (/** @type {VendorProgress} */ r) => r.percent },
      cell: ({ row }) => (
        <ProgressBar percent={row.original.percent} label={`Progres ${nameOf(row.original)}`} />
      ),
    },
    {
      id: 'completed',
      header: 'Selesai',
      meta: { sortValue: (/** @type {VendorProgress} */ r) => r.completed },
      cell: ({ row }) => count(row.original.completed),
    },
    {
      id: 'in_progress',
      header: 'Dikerjakan',
      meta: { hideBelow: 'lg', sortValue: (/** @type {VendorProgress} */ r) => r.inProgress },
      cell: ({ row }) => count(row.original.inProgress),
    },
    {
      id: 'not_started',
      header: 'Belum mulai',
      meta: { hideBelow: 'lg', sortValue: (/** @type {VendorProgress} */ r) => r.notStarted },
      cell: ({ row }) => count(row.original.notStarted),
    },
    {
      id: 'total',
      header: 'Total task',
      meta: { sortValue: (/** @type {VendorProgress} */ r) => r.total },
      cell: ({ row }) => count(row.original.total),
    },
  ];

  return (
    <>
      <PageHeader
        title="Progress vendor"
        description={`Progres task per vendor · ${range.error ? '—' : periodText(range)}`}
      />

      <FilterBar
        className="mb-3"
        search={params.q}
        onSearchChange={(q) => setParams({ q: q || null })}
        searchPlaceholder="Cari vendor atau site"
      />
      <ReportFilters
        // The vendor filter only offers vendors of the chosen site.
        params={{ ...params, site_id: siteId ?? '' }}
        showSite={site.showSiteFilter}
        showVendor={site.showVendorFilter}
        // A new site may not be served by the selected vendor: clear it.
        onChange={(updates) =>
          setParams(
            'site_id' in updates
              ? { site_id: updates.site_id || null, vendor_id: null }
              : { vendor_id: updates.vendor_id || null },
          )
        }
      >
        <ProgressDateFilter date={range.from} today={today} onChange={setParams} />
      </ReportFilters>

      {range.error ? null : (
        <QueryList
          query={query}
          rows={rows}
          empty={{
            icon: BarChart3,
            title: 'Belum ada progres',
            description: 'Tidak ada task vendor pada periode dan filter ini.',
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
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex flex-col">
                <span className="font-semibold text-foreground">{nameOf(row)}</span>
                <span className="text-sm text-muted-foreground">{siteNameOf(row)}</span>
              </span>
              <ProgressBar percent={row.percent} label={`Progres ${nameOf(row)}`} />
              <span className="text-sm text-muted-foreground tabular-nums">
                {row.completed} selesai · {row.inProgress} dikerjakan · {row.notStarted} belum mulai
                · {row.total} task
              </span>
            </Link>
          )}
        />
      )}
    </>
  );
}
