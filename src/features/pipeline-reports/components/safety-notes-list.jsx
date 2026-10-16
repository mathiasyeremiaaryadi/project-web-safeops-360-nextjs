'use client';

import Link from 'next/link';
import { parseAsString } from 'nuqs';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { PageHeader } from '@/components/layout/page-header';
import { ListWithPanel } from '@/components/shared/list-with-panel';
import { QueryList } from '@/components/shared/query-list';
import { ReportFilters } from '@/components/shared/report-filters';
import { neighbourId, useDetailPanel } from '@/hooks/use-detail-panel';
import { useListParams } from '@/hooks/use-list-params';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { useSiteContext } from '@/hooks/use-site-context';
import { formatDate } from '@/lib/date';
import { useTaskReports } from '@/features/pipeline-reports/api/queries';
import { shiftLabel } from '@/features/pipeline-reports/components/report-badges';
import { TaskReportDetail } from '@/features/pipeline-reports/components/task-report-detail';
import { NOTE_CATEGORY_LABELS } from '@/features/pipeline-reports/lib/constants';

/** @typedef {import('@/features/pipeline-reports/api/schemas').TaskReport} TaskReport */

/** Category filter: `ANY` = every report with a safety finding. */
const CATEGORY_FILTERS = Object.freeze([
  { value: 'ANY', label: 'Semua temuan' },
  ...Object.entries(NOTE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
]);

const FILTERS = {
  note_category: parseAsString.withDefault('ANY'),
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  vendor_id: parseAsString.withDefault(''),
};

const hrefOf = (/** @type {string} */ id) => `/reports/tasks/${id}`;

/** @param {string | null | undefined} category */
const categoryLabel = (category) =>
  NOTE_CATEGORY_LABELS[/** @type {keyof typeof NOTE_CATEGORY_LABELS} */ (category ?? '')] ??
  category ??
  '—';

/**
 * `/safety-notes` — "Catatan safety": every task report with a safety finding (near miss, unsafe
 * action, unsafe condition) and its notes, newest first, with category, date, site and vendor
 * filters; a row opens the report.
 */
export function SafetyNotesList() {
  const { params, limit, setFilters, setPage } = useListParams(FILTERS);
  const site = useSiteContext();
  const category =
    CATEGORY_FILTERS.find((option) => option.value === params.note_category) ?? CATEGORY_FILTERS[0];
  const { page, from, to, vendor_id } = params;
  const site_id = site.siteIdFor(params.site_id);
  const query = useTaskReports({
    page,
    limit,
    from,
    to,
    site_id,
    vendor_id,
    note_category: category.value,
  });
  const users = useOptionLabels('users');
  const panel = useDetailPanel(hrefOf);
  // A backend without the filter returns every report: keep the ones with a finding.
  const rows = (query.data?.data ?? []).filter(
    (r) => r.note_category && (category.value === 'ANY' || r.note_category === category.value),
  );
  const workerOf = (/** @type {TaskReport} */ r) => r.worker_name ?? users.labelOf(r.user_id);

  const columns = [
    {
      id: 'date',
      header: 'Tanggal',
      meta: { sortValue: (r) => r.report_date },
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{formatDate(row.original.report_date)}</span>
      ),
    },
    {
      id: 'category',
      header: 'Kategori',
      meta: { sortValue: (r) => r.note_category },
      cell: ({ row }) => (
        <Badge variant="danger">{categoryLabel(row.original.note_category)}</Badge>
      ),
    },
    {
      id: 'task',
      header: 'Titik',
      meta: { sortValue: (r) => r.task_name },
      cell: ({ row }) => (
        <Link
          href={hrefOf(row.original.id)}
          onClick={(event) => {
            event.stopPropagation();
            panel.open(row.original.id, event);
          }}
          className="flex flex-col rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="font-semibold text-foreground hover:underline">
            {row.original.task_name ?? 'Laporan task'}
          </span>
          <span className="text-sm text-muted-foreground">
            {[row.original.pipeline_name, row.original.site_name].filter(Boolean).join(' · ')}
          </span>
        </Link>
      ),
    },
    {
      id: 'worker',
      header: 'Worker',
      meta: { hideBelow: 'lg', sortValue: workerOf },
      cell: ({ row }) => (
        <span className="flex flex-col">
          {workerOf(row.original)}
          <span className="text-sm text-muted-foreground">
            Shift {shiftLabel(row.original.shift)}
          </span>
        </span>
      ),
    },
    {
      id: 'note',
      header: 'Catatan',
      cell: ({ row }) => (
        <span className="line-clamp-2 text-muted-foreground">{row.original.note || '—'}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Catatan safety"
        description="Temuan K3 dari laporan worker: near miss, unsafe action, dan unsafe condition."
      />
      <ReportFilters
        params={{ ...params, site_id: site_id ?? '' }}
        onChange={setFilters}
        showSite={site.showSiteFilter}
        showVendor={site.showVendorFilter}
        dateRange
        className={site.showSiteFilter && site.showVendorFilter ? 'xl:grid-cols-5' : undefined}
      >
        <NativeSelect
          aria-label="Filter kategori temuan"
          className="w-full"
          value={category.value}
          onChange={(e) => setFilters({ note_category: e.target.value })}
        >
          {CATEGORY_FILTERS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </ReportFilters>

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
            icon: ShieldAlert,
            title: 'Tidak ada temuan',
            description: 'Belum ada temuan safety untuk kategori dan filter ini.',
          }}
          noun="temuan"
          onPageChange={setPage}
          columns={columns}
          getRowId={(r) => r.id}
          caption="Daftar temuan safety"
          onRowClick={(r) => panel.open(r.id)}
          isRowSelected={(r) => r.id === panel.selectedId}
          renderCard={(r) => (
            <Link
              href={hrefOf(r.id)}
              className="flex flex-col gap-1.5 rounded-2xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center justify-between gap-2">
                <Badge variant="danger">{categoryLabel(r.note_category)}</Badge>
                <span className="text-sm text-muted-foreground">{formatDate(r.report_date)}</span>
              </span>
              <span className="font-semibold text-foreground">{r.task_name ?? 'Laporan task'}</span>
              <span className="text-sm text-muted-foreground">
                {[r.site_name, workerOf(r), `Shift ${shiftLabel(r.shift)}`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {r.note ? (
                <span className="line-clamp-3 text-sm text-foreground">{r.note}</span>
              ) : null}
            </Link>
          )}
        />
      </ListWithPanel>
    </>
  );
}
