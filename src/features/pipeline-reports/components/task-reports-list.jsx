'use client';

import Link from 'next/link';
import { parseAsString } from 'nuqs';
import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ListWithPanel } from '@/components/shared/list-with-panel';
import { QueryList } from '@/components/shared/query-list';
import { ReportFilters } from '@/components/shared/report-filters';
import { StatusTabs } from '@/components/shared/status-tabs';
import { neighbourId, useDetailPanel } from '@/hooks/use-detail-panel';
import { useListParams } from '@/hooks/use-list-params';
import { useSiteContext } from '@/hooks/use-site-context';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { DATA_SCOPE } from '@/lib/auth/permissions';
import { formatDateTime } from '@/lib/date';
import { filterRows } from '@/lib/search';
import { useTaskReports } from '@/features/pipeline-reports/api/queries';
import { ReportBadges, shiftLabel } from '@/features/pipeline-reports/components/report-badges';
import { TaskReportDetail } from '@/features/pipeline-reports/components/task-report-detail';
import {
  DEFAULT_TASK_REPORT_TAB,
  TASK_REPORT_TABS,
} from '@/features/pipeline-reports/lib/constants';

/** @typedef {import('@/features/pipeline-reports/api/schemas').TaskReport} TaskReport */

const FILTERS = {
  tab: parseAsString.withDefault(DEFAULT_TASK_REPORT_TAB),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  vendor_id: parseAsString.withDefault(''),
};

const hrefOf = (/** @type {string} */ id) => `/reports/tasks/${id}`;

/** `/reports/tasks` — "Review laporan": status tabs, filters, list + 2XL preview panel. */
export function TaskReportsList() {
  const { params, limit, setFilters, setPage } = useListParams(FILTERS);
  const tab = TASK_REPORT_TABS.find((t) => t.value === params.tab) ?? TASK_REPORT_TABS[0];
  const site = useSiteContext();
  const { page, from, to, vendor_id } = params;
  const site_id = site.siteIdFor(params.site_id);
  const query = useTaskReports({ page, limit, from, to, site_id, vendor_id, ...tab.params });
  const users = useOptionLabels('users');
  const panel = useDetailPanel(hrefOf);
  // Same filters here (Postman has no `revision_status` filter), in case the backend ignores them.
  const rows = filterRows(query.data?.data ?? [], { ...tab.params, vendor_id });
  const workerOf = (/** @type {TaskReport} */ r) => r.worker_name ?? users.labelOf(r.user_id);

  /** @param {TaskReport} r */
  const taskCell = (r) => (
    <Link
      href={hrefOf(r.id)}
      onClick={(event) => {
        event.stopPropagation();
        panel.open(r.id, event);
      }}
      className="flex flex-col rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="font-semibold text-foreground hover:underline">
        {r.task_name ?? 'Laporan task'}
      </span>
      {r.pipeline_name ? (
        <span className="text-sm text-muted-foreground">{r.pipeline_name}</span>
      ) : null}
    </Link>
  );

  const columns = [
    {
      id: 'task',
      header: 'Task',
      meta: { sortValue: (r) => r.task_name },
      cell: ({ row }) => taskCell(row.original),
    },
    {
      id: 'worker',
      header: 'Worker',
      meta: { sortValue: workerOf },
      cell: ({ row }) => workerOf(row.original),
    },
    {
      id: 'shift',
      header: 'Shift',
      meta: { hideBelow: 'lg', sortValue: (r) => r.shift },
      cell: ({ row }) => shiftLabel(row.original.shift),
    },
    {
      id: 'submitted',
      header: 'Dikirim',
      meta: { hideBelow: 'xl', sortValue: (r) => r.submitted_at },
      cell: ({ row }) => formatDateTime(row.original.submitted_at),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { sortValue: (r) => r.status },
      cell: ({ row }) => <ReportBadges report={row.original} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Review laporan"
        description={
          site.mode === DATA_SCOPE.VENDOR
            ? `Laporan dari worker ${site.shortLabel}.`
            : 'Laporan task dari worker yang perlu diperiksa.'
        }
      />
      <StatusTabs
        label="Filter status laporan"
        options={TASK_REPORT_TABS}
        value={tab.value}
        onChange={(value) => setFilters({ tab: value })}
      />
      <ReportFilters
        params={{ ...params, site_id: site_id ?? '' }}
        onChange={setFilters}
        showSite={site.showSiteFilter}
        showVendor={site.showVendorFilter}
        dateRange
      />

      <ListWithPanel
        panelLabel="Pratinjau laporan"
        panel={
          panel.selectedId ? (
            <TaskReportDetail
              key={panel.selectedId}
              id={panel.selectedId}
              variant="panel"
              onReviewed={() => panel.setSelectedId(neighbourId(rows, panel.selectedId))}
            />
          ) : null
        }
      >
        <QueryList
          query={query}
          rows={rows}
          empty={{
            icon: ClipboardCheck,
            title: 'Tidak ada laporan',
            description: 'Belum ada laporan untuk status dan filter ini.',
          }}
          noun="laporan"
          onPageChange={setPage}
          columns={columns}
          getRowId={(r) => r.id}
          caption="Daftar laporan task"
          onRowClick={(r) => panel.open(r.id)}
          isRowSelected={(r) => r.id === panel.selectedId}
          renderCard={(r) => (
            <Link
              href={hrefOf(r.id)}
              className="flex flex-col gap-1.5 rounded-2xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-semibold text-foreground">{r.task_name ?? 'Laporan task'}</span>
              <span className="text-sm text-muted-foreground">
                {[r.pipeline_name, workerOf(r), shiftLabel(r.shift)].filter(Boolean).join(' · ')}
              </span>
              <ReportBadges report={r} />
            </Link>
          )}
        />
      </ListWithPanel>
    </>
  );
}
