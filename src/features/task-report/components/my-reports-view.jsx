'use client';

import Link from 'next/link';
import { parseAsString, useQueryStates } from 'nuqs';
import { ChevronRight, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { LoadMore } from '@/components/shared/load-more';
import { StatusTabs } from '@/components/shared/status-tabs';
import { formatDate, todayInAppTimezone } from '@/lib/date';
import { filterRows } from '@/lib/search';
import { ReportBadges } from '@/features/pipeline-reports';
import { useMyReports } from '@/features/task-report/api/queries';
import { HISTORY_TABS, resolveHistoryRange } from '@/features/task-report/lib/history';

const FILTERS = {
  tab: parseAsString.withDefault(''),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
};

/** `/history` — "Riwayat laporan": the Worker's own task reports as cards. */
export function MyReportsView() {
  const today = todayInAppTimezone();
  const [filters, setFilters] = useQueryStates(FILTERS);
  const range = resolveHistoryRange(filters.from, filters.to, today);
  const tab = HISTORY_TABS.find((t) => t.value === filters.tab) ?? HISTORY_TABS[0];
  const query = useMyReports(
    { from: range.from, to: range.to, ...tab.params },
    { enabled: !range.error },
  );
  // Same status filter here (Postman has no `revision_status` filter).
  const reports = filterRows(query.data?.pages.flatMap((page) => page.data) ?? [], tab.params);

  return (
    <>
      <PageHeader title="Riwayat laporan" description="Laporan task yang pernah Anda kerjakan." />

      <StatusTabs
        label="Filter status"
        options={HISTORY_TABS}
        value={tab.value}
        onChange={(value) => setFilters({ tab: value || null })}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:flex sm:items-end">
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Dari
          <Input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setFilters({ from: e.target.value || null })}
            className="h-12 sm:w-44"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Sampai
          <Input
            type="date"
            value={range.to}
            min={range.from}
            max={today}
            onChange={(e) => setFilters({ to: e.target.value === today ? null : e.target.value })}
            className="h-12 sm:w-44"
          />
        </label>
      </div>

      {range.error ? (
        <p role="alert" className="text-sm text-destructive">
          {range.error}
        </p>
      ) : query.isPending ? (
        <ListSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={History}
          title="Belum ada laporan"
          description="Tidak ada laporan pada rentang tanggal dan status ini."
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {reports.map((report) => (
              <li key={report.id}>
                <Link
                  href={`/tasks/report/${report.id}`}
                  className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-semibold text-foreground">
                      {report.task_name ?? 'Laporan task'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {[
                        report.report_date ? formatDate(report.report_date) : null,
                        report.shift ? `Shift ${report.shift}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {report.pipeline_name ? (
                      <span className="truncate text-sm text-muted-foreground">
                        {report.pipeline_name}
                      </span>
                    ) : null}
                    <ReportBadges report={report} />
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <LoadMore query={query} />
        </>
      )}
    </>
  );
}
