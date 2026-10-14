'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsString } from 'nuqs';
import { Plus, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { PageHeader } from '@/components/layout/page-header';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterBar } from '@/components/shared/filter-bar';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveList } from '@/components/shared/responsive-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { useListParams } from '@/hooks/use-list-params';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { can } from '@/lib/auth/permissions';
import { searchRows } from '@/lib/search';
import { MASTER_STATUS_BADGES } from '@/lib/constants';
import { useSession } from '@/features/auth';
import { usePipelines } from '@/features/pipelines/api/queries';
import { PipelineFormDialog } from '@/features/pipelines/components/pipeline-form-dialog';

const FILTERS = { vendor_id: parseAsString.withDefault(''), status: parseAsString.withDefault('') };
const STATUS_FILTERS = [
  { value: '', label: 'Semua status' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Nonaktif' },
];

/** @param {number | null | undefined} count */
const taskCount = (count) => (typeof count === 'number' ? `${count} task` : '—');

/** `/pipelines` — list with vendor/status filters and "Buat pipeline". */
export function PipelinesList() {
  const router = useRouter();
  const { user } = useSession();
  const { params, limit, setFilters, setPage } = useListParams(FILTERS);
  const query = usePipelines({ ...params, limit });
  const vendors = useOptionLabels('vendors');
  // Server `?q=` + the same search here, in case the backend ignores `q`.
  const rows = query.data
    ? searchRows(query.data.data, params.q, (p) => [
        p.name,
        p.description,
        vendors.labelOf(p.vendor_id),
      ])
    : [];
  const [creating, setCreating] = useState(false);
  const selectedVendor = params.vendor_id
    ? { value: params.vendor_id, label: vendors.labelOf(params.vendor_id) }
    : null;

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
      id: 'count',
      header: 'Jumlah task',
      meta: { sortValue: (/** @type {any} */ p) => p.item_count },
      cell: ({ row }) => taskCount(row.original.item_count),
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
        title="Pipeline & task"
        description="Alur pekerjaan vendor: urutan task yang dikerjakan worker."
        actions={
          can(user, 'PIPELINE_WRITE') ? (
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
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,320px)_200px]">
        <AsyncCombobox
          lookup="vendors"
          value={selectedVendor}
          onChange={(option) => setFilters({ vendor_id: option?.value ?? '' })}
          placeholder="Semua vendor"
          ariaLabel="Filter vendor"
        />
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

      {query.isPending ? <ListSkeleton /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Belum ada pipeline"
          description="Ubah filter, atau buat pipeline baru."
        />
      ) : null}
      {query.isSuccess && rows.length > 0 ? (
        <ResponsiveList
          data={rows}
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
                {vendors.labelOf(pipeline.vendor_id)} · {taskCount(pipeline.item_count)}
              </span>
            </Link>
          )}
          footer={
            <Pagination
              page={query.data.page}
              limit={query.data.limit}
              total={query.data.total}
              count={query.data.data.length}
              noun="pipeline"
              onPageChange={setPage}
            />
          }
        />
      ) : null}

      <PipelineFormDialog open={creating} pipeline={null} onClose={() => setCreating(false)} />
    </>
  );
}
