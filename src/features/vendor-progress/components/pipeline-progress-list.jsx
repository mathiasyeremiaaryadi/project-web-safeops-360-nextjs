'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { FilterBar } from '@/components/shared/filter-bar';
import { ReportFilters } from '@/components/shared/report-filters';
import { QueryList } from '@/components/shared/query-list';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { searchRows } from '@/lib/search';
import { usePipelines } from '@/features/pipelines';
import { usePipelineProgress } from '@/features/vendor-progress/api/queries';
import { ProgressBar } from '@/features/vendor-progress/components/progress-bar';
import { ProgressDateFilter } from '@/features/vendor-progress/components/progress-date-filter';
import { periodText } from '@/features/vendor-progress/components/vendor-progress-list';
import { useProgressFilters } from '@/features/vendor-progress/hooks/use-progress-filters';

/** @typedef {import('@/features/vendor-progress/lib/pipeline-progress').PipelineProgress} PipelineProgress */

/** @param {number} value */
const count = (value) => <span className="tabular-nums">{value}</span>;

/**
 * `/pipeline-progress` — the Admin vendor's progress per pipeline for a period (today by
 * default). A row opens the pipeline and its tasks.
 */
export function PipelineProgressList() {
  const router = useRouter();
  const { params, setParams, today, range, site, siteId } = useProgressFilters();
  const query = usePipelineProgress({ dates: range.dates, site_id: siteId });
  const sites = useOptionLabels('sites');
  const pipelines = usePipelines({ page: 1, limit: 100 });
  /** @param {PipelineProgress} row */
  const nameOf = (row) =>
    row.pipelineName ??
    pipelines.data?.data.find((p) => p.id === row.pipelineId)?.name ??
    'Pipeline';
  /** @param {PipelineProgress} row */
  const siteNameOf = (row) => {
    if (row.siteName) return row.siteName;
    return sites.labelOf(siteIdOf(row) ?? siteId);
  };
  /** Site of a row: from the report, else from its pipeline (`site_id`, Postman). */
  /** @param {PipelineProgress} row */
  const siteIdOf = (row) =>
    row.siteId ?? pipelines.data?.data.find((p) => p.id === row.pipelineId)?.site_id ?? null;
  // The backend may ignore `site_id`: keep only the chosen site's pipelines here too.
  const inSite = (/** @type {PipelineProgress} */ row) =>
    !siteId || !siteIdOf(row) || siteIdOf(row) === siteId;
  const rows = query.data
    ? searchRows(query.data.data.filter(inSite), params.q, (row) => [nameOf(row), siteNameOf(row)])
    : [];
  /** @param {PipelineProgress} row */
  const hrefOf = (row) => (row.pipelineId ? `/pipelines/${row.pipelineId}` : null);

  const columns = [
    {
      id: 'pipeline',
      header: 'Pipeline',
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
      meta: { sortValue: (/** @type {PipelineProgress} */ r) => r.percent },
      cell: ({ row }) => (
        <ProgressBar percent={row.original.percent} label={`Progres ${nameOf(row.original)}`} />
      ),
    },
    {
      id: 'completed',
      header: 'Selesai',
      meta: { sortValue: (/** @type {PipelineProgress} */ r) => r.completed },
      cell: ({ row }) => count(row.original.completed),
    },
    {
      id: 'in_progress',
      header: 'Dikerjakan',
      meta: { hideBelow: 'lg', sortValue: (/** @type {PipelineProgress} */ r) => r.inProgress },
      cell: ({ row }) => count(row.original.inProgress),
    },
    {
      id: 'late',
      header: 'Terlambat upload',
      meta: { hideBelow: 'xl', sortValue: (/** @type {PipelineProgress} */ r) => r.lateUpload },
      cell: ({ row }) => count(row.original.lateUpload),
    },
    {
      id: 'not_started',
      header: 'Belum mulai',
      meta: { hideBelow: 'lg', sortValue: (/** @type {PipelineProgress} */ r) => r.notStarted },
      cell: ({ row }) => count(row.original.notStarted),
    },
    {
      id: 'total',
      header: 'Total task',
      meta: { sortValue: (/** @type {PipelineProgress} */ r) => r.total },
      cell: ({ row }) => count(row.original.total),
    },
  ];

  return (
    <>
      <PageHeader
        title="Progress pipeline"
        description={`Progres task per pipeline · ${range.error ? '—' : periodText(range)}`}
      />

      <FilterBar
        className="mb-3"
        search={params.q}
        onSearchChange={(q) => setParams({ q: q || null })}
        searchPlaceholder="Cari pipeline atau site"
      />
      {/* An Admin vendor's pipelines are all their own vendor's: no vendor filter. */}
      <ReportFilters
        params={{ ...params, site_id: siteId ?? '' }}
        showSite={site.showSiteFilter}
        showVendor={false}
        onChange={(updates) => setParams({ site_id: updates.site_id || null })}
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
            description: 'Tidak ada task pipeline pada periode dan filter ini.',
          }}
          noun="pipeline"
          onPageChange={() => {}}
          columns={columns}
          getRowId={(row) => row.key}
          caption="Progress pipeline"
          cardGridClassName="sm:grid-cols-2"
          onRowClick={(row) => {
            const href = hrefOf(row);
            if (href) router.push(href);
          }}
          renderCard={(row) => {
            const body = (
              <>
                <span className="flex flex-col">
                  <span className="font-semibold text-foreground">{nameOf(row)}</span>
                  <span className="text-sm text-muted-foreground">{siteNameOf(row)}</span>
                </span>
                <ProgressBar percent={row.percent} label={`Progres ${nameOf(row)}`} />
                <span className="text-sm text-muted-foreground tabular-nums">
                  {row.completed} selesai · {row.inProgress} dikerjakan · {row.lateUpload} terlambat
                  · {row.notStarted} belum mulai · {row.total} task
                </span>
              </>
            );
            const className =
              'flex flex-col gap-3 rounded-2xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring';
            const href = hrefOf(row);
            return href ? (
              <Link href={href} className={className}>
                {body}
              </Link>
            ) : (
              <div className={className}>{body}</div>
            );
          }}
        />
      )}
    </>
  );
}
