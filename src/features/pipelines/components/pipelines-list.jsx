'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsString } from 'nuqs';
import { Plus, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { PageHeader } from '@/components/layout/page-header';
import { FilterBar } from '@/components/shared/filter-bar';
import { LookupFilter } from '@/components/shared/lookup-filter';
import { QueryList } from '@/components/shared/query-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { useListParams } from '@/hooks/use-list-params';
import { useSiteContext } from '@/hooks/use-site-context';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { can } from '@/lib/auth/permissions';
import { filterRows, searchRows } from '@/lib/search';
import { MASTER_STATUS_BADGES } from '@/lib/constants';
import { useSession } from '@/features/auth';
import { usePipelines } from '@/features/pipelines/api/queries';
import { PipelineFormDialog } from '@/features/pipelines/components/pipeline-form-dialog';
import { formatTaskCount } from '@/features/pipelines/lib/task-count';

const FILTERS = {
  site_id: parseAsString.withDefault(''),
  vendor_id: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
};
const STATUS_FILTERS = [
  { value: '', label: 'Semua status' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Nonaktif' },
];

/** `/pipelines` — list with site/vendor/status filters and "Buat pipeline". */
export function PipelinesList() {
  const router = useRouter();
  const { user } = useSession();
  const canWritePipelines = can(user, 'PIPELINE_WRITE');
  const { params, limit, setFilters, setPage } = useListParams(FILTERS);
  const site = useSiteContext();
  // Admin with a single site: always scope to it (no switcher, so no active choice is stored).
  const mySiteIds = site.scoped ? site.sites.map((s) => s.value) : [];
  const siteId =
    site.siteIdFor(params.site_id) ?? (mySiteIds.length === 1 ? mySiteIds[0] : undefined);
  const query = usePipelines({ ...params, site_id: siteId, limit });
  const vendors = useOptionLabels('vendors');
  const sites = useOptionLabels('sites');
  /** @param {{ site_id?: string | null }} p */
  const siteOf = (p) => (p.site_id ? sites.labelOf(p.site_id) : '—');
  // Server `?q=` / filters + the same here, in case the backend ignores them.
  // Admin: only pipelines of their own site(s); the backend may also return site-less ones.
  const inScope = (/** @type {{ site_id?: string | null }} */ p) =>
    !site.scoped || mySiteIds.length === 0
      ? true
      : !!p.site_id && (siteId ? p.site_id === siteId : mySiteIds.includes(p.site_id));
  const rows = query.data
    ? searchRows(
        filterRows(query.data.data.filter(inScope), {
          vendor_id: params.vendor_id,
          status: params.status,
        }),
        params.q,
        (p) => [p.name, p.description, vendors.labelOf(p.vendor_id), siteOf(p)],
      )
    : [];
  const [creating, setCreating] = useState(false);

  const columns = [
    {
      id: 'name',
      meta: { sortValue: (/** @type {any} */ p) => p.name },
      header: 'Pipeline',
      cell: ({ row }) => (
        <Link
          href={`/pipelines/${row.original.id}`}
          className="font-semibold text-foreground hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'vendor',
      header: 'Vendor',
      meta: { sortValue: (/** @type {any} */ p) => vendors.labelOf(p.vendor_id) },
      cell: ({ row }) => vendors.labelOf(row.original.vendor_id),
    },
    {
      id: 'site',
      header: 'Site',
      meta: { hideBelow: 'lg', sortValue: siteOf },
      cell: ({ row }) => siteOf(row.original),
    },
    {
      id: 'count',
      header: 'Jumlah task',
      meta: { sortValue: (/** @type {any} */ p) => p.item_count },
      cell: ({ row }) => formatTaskCount(row.original),
    },
    {
      id: 'status',
      meta: { sortValue: (/** @type {any} */ p) => p.status },
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={MASTER_STATUS_BADGES[row.original.status]} />,
    },
  ];

  return (
    <>
      <PageHeader
        // Without pipeline rights (Admin vendor) the page is about the tasks inside pipelines.
        title={canWritePipelines ? 'Pipeline & task' : 'Pipeline item'}
        description={
          canWritePipelines
            ? 'Alur pekerjaan vendor: urutan task yang dikerjakan worker.'
            : 'Atur task di pipeline vendor Anda.'
        }
        actions={
          canWritePipelines ? (
            <Button
              type="button"
              className="h-11 px-5 text-base font-semibold"
              onClick={() => setCreating(true)}
            >
              <Plus aria-hidden="true" className="size-5" />
              Buat pipeline
            </Button>
          ) : null
        }
      />

      <FilterBar
        className="mb-3"
        search={params.q}
        onSearchChange={(q) => setFilters({ q })}
        searchPlaceholder="Cari nama pipeline atau vendor"
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,280px)_minmax(0,280px)_200px]">
        {site.showSiteFilter ? (
          <LookupFilter
            lookup="sites"
            value={params.site_id}
            // A new site may not be served by the selected vendor: clear it.
            onChange={(site_id) => setFilters({ site_id, vendor_id: '' })}
            placeholder="Semua site"
            ariaLabel="Filter site"
          />
        ) : null}
        {site.showVendorFilter ? (
          <LookupFilter
            lookup="vendors"
            params={siteId ? { site_id: siteId } : undefined}
            value={params.vendor_id}
            onChange={(vendor_id) => setFilters({ vendor_id })}
            placeholder="Semua vendor"
            ariaLabel="Filter vendor"
          />
        ) : null}
        <NativeSelect
          aria-label="Filter status"
          className="w-full"
          value={params.status}
          onChange={(e) => setFilters({ status: e.target.value })}
        >
          {STATUS_FILTERS.map((o) => (
            <NativeSelectOption key={o.value} value={o.value}>
              {o.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <QueryList
        query={query}
        rows={rows}
        empty={{
          icon: Workflow,
          title: 'Belum ada pipeline',
          description: 'Ubah filter, atau buat pipeline baru.',
        }}
        noun="pipeline"
        onPageChange={setPage}
        columns={columns}
        getRowId={(pipeline) => pipeline.id}
        caption="Daftar pipeline"
        cardGridClassName="sm:grid-cols-2"
        onRowClick={(pipeline) => router.push(`/pipelines/${pipeline.id}`)}
        renderCard={(pipeline) => (
          <Link
            href={`/pipelines/${pipeline.id}`}
            className="flex flex-col gap-1.5 rounded-2xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="font-semibold text-foreground">{pipeline.name}</span>
              <StatusBadge status={MASTER_STATUS_BADGES[pipeline.status]} />
            </span>
            <span className="text-sm text-muted-foreground">
              {vendors.labelOf(pipeline.vendor_id)} · {siteOf(pipeline)} ·{' '}
              {formatTaskCount(pipeline)}
            </span>
          </Link>
        )}
      />

      <PipelineFormDialog open={creating} pipeline={null} onClose={() => setCreating(false)} />
    </>
  );
}
