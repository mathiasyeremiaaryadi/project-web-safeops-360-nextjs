'use client';

import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';
import { PackageOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { LoadMore } from '@/components/shared/load-more';
import { StatusTabs } from '@/components/shared/status-tabs';
import {
  useLatestInventoryReports,
  useMyInventoryReports,
} from '@/features/my-inventory-reports/api/inventory-report-api';
import { InventoryReportCard } from '@/features/my-inventory-reports/components/inventory-report-card';
import { InventoryReportForm } from '@/features/my-inventory-reports/components/inventory-report-form';

const TABS = [
  { value: '', label: 'Lapor' },
  { value: 'mine', label: 'Laporan saya' },
];

const LATEST_LIMIT = 5;

/**
 * `/inventory-reports/new` — the form with the latest 5 reports beside it (below it under
 * 1024px); `?tab=mine` shows all of the worker's reports.
 */
export function ReportInventoryView() {
  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault(''));
  const showAll = tab === 'mine';

  return (
    <>
      <PageHeader
        title="Lapor inventory"
        description="Minta perlengkapan baru atau laporkan perlengkapan yang rusak."
      />
      <StatusTabs
        label="Tampilan"
        options={TABS}
        value={showAll ? 'mine' : ''}
        onChange={(value) => setTab(value || null)}
      />
      {showAll ? (
        <AllReports />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:grid-cols-[minmax(0,1fr)_380px]">
          <InventoryReportForm />
          <LatestReports />
        </div>
      )}
    </>
  );
}

/** "Laporan saya" panel: the latest 5 and "Lihat semua". */
function LatestReports() {
  const query = useLatestInventoryReports(LATEST_LIMIT);
  const rows = (query.data?.data ?? []).slice(0, LATEST_LIMIT);
  return (
    <section
      aria-labelledby="my-inventory-reports-title"
      className="rounded-2xl border bg-card p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="my-inventory-reports-title" className="font-semibold text-foreground">
          Laporan saya
        </h2>
        <Link
          href="/inventory-reports/new?tab=mine"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Lihat semua
        </Link>
      </div>
      {query.isPending ? <ListSkeleton rows={2} /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.isSuccess && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada laporan inventory.</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {rows.map((report) => (
          <li key={report.id}>
            <InventoryReportCard report={report} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** All of the worker's inventory reports, 20 at a time. */
function AllReports() {
  const query = useMyInventoryReports();
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  if (query.isPending) return <ListSkeleton rows={4} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (rows.length === 0) {
    return <EmptyState icon={PackageOpen} title="Belum ada laporan inventory" />;
  }
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((report) => (
          <li key={report.id}>
            <InventoryReportCard report={report} />
          </li>
        ))}
      </ul>
      <LoadMore query={query} />
    </>
  );
}
