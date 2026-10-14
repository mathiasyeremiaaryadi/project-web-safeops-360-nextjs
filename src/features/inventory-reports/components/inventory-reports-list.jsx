'use client';

import Link from 'next/link';
import { parseAsString } from 'nuqs';
import { PackageX } from 'lucide-react';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ListWithPanel } from '@/components/shared/list-with-panel';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { Pagination } from '@/components/shared/pagination';
import { ReportFilters } from '@/components/shared/report-filters';
import { ResponsiveList } from '@/components/shared/responsive-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusTabs } from '@/components/shared/status-tabs';
import { useDetailPanel } from '@/hooks/use-detail-panel';
import { useListParams } from '@/hooks/use-list-params';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { formatDateTime } from '@/lib/date';
import { useInventoryReports } from '@/features/inventory-reports/api/queries';
import { InventoryReportDetail } from '@/features/inventory-reports/components/inventory-report-detail';
import {
  INVENTORY_REPORT_STATUS_BADGES,
  INVENTORY_REPORT_TABS,
  INVENTORY_REPORT_TYPE_LABELS,
  TYPE_FILTERS,
} from '@/features/inventory-reports/lib/constants';

/** @typedef {import('@/features/inventory-reports/api/schemas').InventoryReport} InventoryReport */

const FILTERS = {
  status: parseAsString.withDefault(''),
  report_type: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  vendor_id: parseAsString.withDefault(''),
};

const hrefOf = (/** @type {string} */ id) => `/reports/inventory/${id}`;
const typeOf = (/** @type {InventoryReport} */ r) =>
  INVENTORY_REPORT_TYPE_LABELS[r.report_type] ?? (r.report_type || '—');
const statusBadge = (/** @type {InventoryReport} */ r) => (
  <StatusBadge status={INVENTORY_REPORT_STATUS_BADGES[r.status]} fallback={r.status || '—'} />
);

/** `/reports/inventory` — status tabs, type/site/vendor filters, list + 2XL panel. */
export function InventoryReportsList() {
  const { params, limit, setFilters, setPage } = useListParams(FILTERS);
  const { page, status, report_type, site_id, vendor_id } = params;
  const query = useInventoryReports({ page, limit, status, report_type, site_id, vendor_id });
  const users = useOptionLabels('users');
  const vendors = useOptionLabels('vendors');
  const panel = useDetailPanel(hrefOf);
  const rows = query.data?.data ?? [];
  const subjectOf = (/** @type {InventoryReport} */ r) =>
    r.inventory_name ?? vendors.labelOf(r.vendor_id);
  const reporterOf = (/** @type {InventoryReport} */ r) =>
    r.reporter_name ?? users.labelOf(r.user_id);

  /** @param {InventoryReport} r */
  const subjectCell = (r) => (
    <Link
      href={hrefOf(r.id)}
      onClick={(event) => {
        event.stopPropagation();
        panel.open(r.id, event);
      }}
      className="flex flex-col rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="font-semibold text-foreground hover:underline">{subjectOf(r)}</span>
      {r.description ? (
        <span className="line-clamp-1 text-sm text-muted-foreground">{r.description}</span>
      ) : null}
    </Link>
  );

  const columns = [
    {
      id: 'type',
      header: 'Jenis',
      meta: { sortValue: typeOf },
      cell: ({ row }) => typeOf(row.original),
    },
    {
      id: 'subject',
      header: 'Inventory & keterangan',
      meta: { sortValue: subjectOf },
      cell: ({ row }) => subjectCell(row.original),
    },
    {
      id: 'reporter',
      header: 'Pelapor',
      meta: { sortValue: reporterOf },
      cell: ({ row }) => reporterOf(row.original),
    },
    {
      id: 'date',
      header: 'Tanggal',
      meta: { hideBelow: 'lg', sortValue: (r) => r.reported_at },
      cell: ({ row }) => formatDateTime(row.original.reported_at),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { sortValue: (r) => r.status },
      cell: ({ row }) => statusBadge(row.original),
    },
  ];

  return (
    <>
      <PageHeader
        title="Laporan inventory"
        description="Permintaan dan laporan kerusakan inventory dari lapangan."
      />
      <StatusTabs
        label="Filter status laporan"
        options={INVENTORY_REPORT_TABS}
        value={params.status}
        onChange={(value) => setFilters({ status: value })}
      />
      <ReportFilters params={params} onChange={setFilters}>
        <NativeSelect
          aria-label="Filter jenis laporan"
          className="w-full"
          value={params.report_type}
          onChange={(e) => setFilters({ report_type: e.target.value })}
        >
          {TYPE_FILTERS.map((o) => (
            <NativeSelectOption key={o.value} value={o.value}>
              {o.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </ReportFilters>

      <ListWithPanel
        panelLabel="Pratinjau laporan"
        panel={
          panel.selectedId ? (
            <InventoryReportDetail key={panel.selectedId} id={panel.selectedId} variant="panel" />
          ) : null
        }
      >
        {query.isPending ? <ListSkeleton /> : null}
        {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
        {query.isSuccess && rows.length === 0 ? (
          <EmptyState
            icon={PackageX}
            title="Tidak ada laporan"
            description="Belum ada laporan untuk status dan filter ini."
          />
        ) : null}
        {query.isSuccess && rows.length > 0 ? (
          <ResponsiveList
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            caption="Daftar laporan inventory"
            onRowClick={(r) => panel.open(r.id)}
            isRowSelected={(r) => r.id === panel.selectedId}
            renderCard={(r) => (
              <Link
                href={hrefOf(r.id)}
                className="flex flex-col gap-1.5 rounded-2xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-foreground">{subjectOf(r)}</span>
                  {statusBadge(r)}
                </span>
                {r.description ? (
                  <span className="line-clamp-2 text-sm text-foreground">{r.description}</span>
                ) : null}
                <span className="text-sm text-muted-foreground">
                  {typeOf(r)} · {reporterOf(r)} · {formatDateTime(r.reported_at)}
                </span>
              </Link>
            )}
            footer={
              <Pagination
                page={query.data.page}
                limit={query.data.limit}
                total={query.data.total}
                count={rows.length}
                noun="laporan"
                onPageChange={setPage}
              />
            }
          />
        ) : null}
      </ListWithPanel>
    </>
  );
}
