'use client';

import Link from 'next/link';
import { parseAsString } from 'nuqs';
import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ListWithPanel } from '@/components/shared/list-with-panel';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { Pagination } from '@/components/shared/pagination';
import { ReportFilters } from '@/components/shared/report-filters';
import { ResponsiveList } from '@/components/shared/responsive-list';
import { StatusTabs } from '@/components/shared/status-tabs';
import { neighbourId, useDetailPanel } from '@/hooks/use-detail-panel';
import { useListParams } from '@/hooks/use-list-params';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { formatDateTime } from '@/lib/date';
import { useTaskReports } from '@/features/pipeline-reports/api/queries';
import { ReportBadges, shiftLabel } from '@/features/pipeline-reports/components/report-badges';
import { TaskReportDetail } from '@/features/pipeline-reports/components/task-report-detail';
import {
  DEFAULT_TASK_REPORT_TAB,
  REVISION_STATUS,
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
  const { page, from, to, site_id, vendor_id } = params;
  const query = useTaskReports({ page, limit, from, to, site_id, vendor_id, ...tab.params });
  const users = useOptionLabels('users');
  const panel = useDetailPanel(hrefOf);
  // Same filter here for "Revisi diminta", in case the backend ignores `revision_status`.
  const rows = (query.data?.data ?? []).filter(
    (r) => tab.value !== 'REVISION' || r.revision_status === REVISION_STATUS.REQUESTED,
  );
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
        description="Laporan task dari worker yang perlu diperiksa."
      />
      <StatusTabs
        label="Filter status laporan"
        options={TASK_REPORT_TABS}
        value={tab.value}
        onChange={(value) => setFilters({ tab: value })}
      />
      <ReportFilters params={params} onChange={setFilters} dateRange />

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
        {query.isPending ? <ListSkeleton /> : null}
        {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
        {query.isSuccess && rows.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Tidak ada laporan"
            description="Belum ada laporan untuk status dan filter ini."
          />
        ) : null}
        {query.isSuccess && rows.length > 0 ? (
          <ResponsiveList
            data={rows}
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
                <span className="font-semibold text-foreground">
                  {r.task_name ?? 'Laporan task'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {[r.pipeline_name, workerOf(r), shiftLabel(r.shift)].filter(Boolean).join(' · ')}
                </span>
                <ReportBadges report={r} />
              </Link>
            )}
            footer={
              <Pagination
                page={query.data.page}
                limit={query.data.limit}
                total={query.data.total}
                count={query.data.data.length}
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
