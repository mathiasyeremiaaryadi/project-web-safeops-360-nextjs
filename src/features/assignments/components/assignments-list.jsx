'use client';

import { useState } from 'react';
import { parseAsString } from 'nuqs';
import { Plus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FilterBar } from '@/components/shared/filter-bar';
import { LookupFilter } from '@/components/shared/lookup-filter';
import { QueryList } from '@/components/shared/query-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusTabs } from '@/components/shared/status-tabs';
import { useListParams } from '@/hooks/use-list-params';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { can } from '@/lib/auth/permissions';
import { formatDate } from '@/lib/date';
import { toastApiError } from '@/lib/notify';
import { searchRows } from '@/lib/search';
import { useSession } from '@/features/auth';
import { useAssignments, useSetAssignmentActive } from '@/features/assignments/api/queries';
import { AssignmentFormDialog } from '@/features/assignments/components/assignment-form-dialog';

/** @typedef {import('@/features/assignments/api/schemas').Assignment} Assignment */

/** `is_active` filter: active by default. */
const TABS = [
  { value: '', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
  { value: 'all', label: 'Semua' },
];

const FILTERS = {
  active: parseAsString.withDefault(''),
  pipeline_id: parseAsString.withDefault(''),
  user_id: parseAsString.withDefault(''),
};

const ACTIVE_BADGES = {
  true: { label: 'Aktif', variant: 'success' },
  false: { label: 'Nonaktif', variant: 'neutral' },
};

/** `/assignments` — which worker does which pipeline task (Admin vendor). */
export function AssignmentsList() {
  const { user } = useSession();
  const canWrite = can(user, 'ASSIGNMENT_WRITE');
  const { params, limit, setFilters, setPage } = useListParams(FILTERS);
  const isActive =
    params.active === 'all' ? undefined : params.active === 'false' ? 'false' : 'true';
  const query = useAssignments({
    page: params.page,
    limit,
    is_active: isActive ?? '',
    pipeline_id: params.pipeline_id,
    user_id: params.user_id,
  });
  const users = useOptionLabels('users');
  const pipelines = useOptionLabels('pipelines');
  const setActive = useSetAssignmentActive();
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState(/** @type {Assignment | null} */ (null));

  /** @param {Assignment} a */
  const workerOf = (a) => a.worker_name ?? users.labelOf(a.user_id);
  /** @param {Assignment} a */
  const pipelineOf = (a) => a.pipeline_name ?? pipelines.labelOf(a.pipeline_id);
  /** @param {Assignment} a */
  const taskOf = (a) => a.task_name ?? '—';
  // The backend may ignore a filter: apply the active state here too.
  const rows = query.data
    ? searchRows(
        query.data.data.filter((a) => isActive === undefined || String(a.is_active) === isActive),
        params.q,
        (a) => [workerOf(a), taskOf(a), pipelineOf(a), a.site_name],
      )
    : [];

  /** @param {Assignment} a */
  const action = (a) =>
    canWrite ? (
      <Button
        type="button"
        variant="outline"
        className={a.is_active ? 'h-10 bg-card text-danger hover:text-danger' : 'h-10 bg-card'}
        onClick={(event) => {
          event.stopPropagation();
          setToggling(a);
        }}
      >
        {a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
      </Button>
    ) : null;

  const columns = [
    {
      id: 'worker',
      header: 'Worker',
      meta: { sortValue: workerOf },
      cell: ({ row }) => <span className="font-semibold">{workerOf(row.original)}</span>,
    },
    {
      id: 'task',
      header: 'Task',
      meta: { sortValue: taskOf },
      cell: ({ row }) => taskOf(row.original),
    },
    {
      id: 'pipeline',
      header: 'Pipeline',
      meta: { hideBelow: 'lg', sortValue: pipelineOf },
      cell: ({ row }) => <span className="text-muted-foreground">{pipelineOf(row.original)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      meta: { sortValue: (/** @type {Assignment} */ a) => String(a.is_active) },
      cell: ({ row }) => <StatusBadge status={ACTIVE_BADGES[String(row.original.is_active)]} />,
    },
    {
      id: 'created',
      header: 'Ditugaskan',
      meta: { hideBelow: 'xl', sortValue: (/** @type {Assignment} */ a) => a.created_at },
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    ...(canWrite
      ? [{ id: 'actions', header: 'Aksi', cell: ({ row }) => action(row.original) }]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Penugasan worker"
        description="Worker yang mengerjakan setiap task pipeline. Shift dipilih worker saat melapor."
        actions={
          canWrite ? (
            <Button
              type="button"
              className="h-11 px-5 text-base font-semibold"
              onClick={() => setCreating(true)}
            >
              <Plus aria-hidden="true" className="size-5" />
              Tambah penugasan
            </Button>
          ) : null
        }
      />

      <StatusTabs
        label="Filter status penugasan"
        options={TABS}
        value={params.active}
        onChange={(value) => setFilters({ active: value })}
      />
      <FilterBar
        className="mb-3"
        search={params.q}
        onSearchChange={(q) => setFilters({ q })}
        searchPlaceholder="Cari worker, task, atau pipeline"
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <LookupFilter
          lookup="pipelines"
          value={params.pipeline_id}
          onChange={(pipeline_id) => setFilters({ pipeline_id })}
          placeholder="Semua pipeline"
          ariaLabel="Filter pipeline"
        />
        <LookupFilter
          lookup="users"
          params={{ role: 'WORKER' }}
          value={params.user_id}
          onChange={(user_id) => setFilters({ user_id })}
          placeholder="Semua worker"
          ariaLabel="Filter worker"
        />
      </div>

      <QueryList
        query={query}
        rows={rows}
        empty={{
          icon: UserCheck,
          title: 'Belum ada penugasan',
          description: 'Ubah filter, atau tugaskan worker ke task pipeline.',
        }}
        noun="penugasan"
        onPageChange={setPage}
        columns={columns}
        getRowId={(a) => a.id}
        caption="Penugasan worker"
        cardGridClassName="sm:grid-cols-2"
        renderCard={(a) => (
          <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold text-foreground">{workerOf(a)}</span>
                <span className="text-sm text-foreground">{taskOf(a)}</span>
                <span className="text-sm text-muted-foreground">{pipelineOf(a)}</span>
              </span>
              <StatusBadge status={ACTIVE_BADGES[String(a.is_active)]} />
            </div>
            {action(a)}
          </div>
        )}
      />

      {canWrite ? (
        <AssignmentFormDialog open={creating} onClose={() => setCreating(false)} />
      ) : null}
      <ConfirmDialog
        open={Boolean(toggling)}
        onOpenChange={(open) => {
          if (!open) setToggling(null);
        }}
        title={toggling?.is_active ? 'Nonaktifkan penugasan?' : 'Aktifkan penugasan?'}
        description={
          toggling
            ? `${workerOf(toggling)} · ${taskOf(toggling)}. ${
                toggling.is_active
                  ? 'Task ini tidak lagi muncul di daftar tugas worker. Laporan lama tetap tersimpan.'
                  : 'Task ini muncul lagi di daftar tugas worker.'
              }`
            : ''
        }
        confirmLabel={toggling?.is_active ? 'Nonaktifkan' : 'Aktifkan'}
        tone={toggling?.is_active ? 'destructive' : 'default'}
        pending={setActive.isPending}
        onConfirm={() => {
          if (!toggling) return;
          setActive.mutate(
            { id: toggling.id, is_active: !toggling.is_active },
            {
              onSuccess: () => {
                toast.success(
                  toggling.is_active ? 'Penugasan dinonaktifkan.' : 'Penugasan diaktifkan.',
                );
                setToggling(null);
              },
              onError: toastApiError,
            },
          );
        }}
      />
    </>
  );
}
