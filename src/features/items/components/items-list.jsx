'use client';

import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterBar } from '@/components/shared/filter-bar';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { MasterRowActions } from '@/components/shared/master-row-actions';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveList } from '@/components/shared/responsive-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusChangeDialog } from '@/components/shared/status-change-dialog';
import { useListParams } from '@/hooks/use-list-params';
import { getErrorMessage } from '@/lib/api/errors';
import { MASTER_STATUS_BADGES } from '@/lib/constants';
import { useChangeItemStatus } from '@/features/items/api/mutations';
import { useItems } from '@/features/items/api/queries';
import { ItemFormDialog } from '@/features/items/components/item-form-dialog';

/** @typedef {import('@/features/items/api/schemas').Item} Item */

/**
 * "Master task" tab of /master.
 * @param {{ createOpen: boolean, onCreateClose: () => void }} props
 */
export function ItemsList({ createOpen, onCreateClose }) {
  const { params, limit, setFilters, setPage } = useListParams();
  const query = useItems({ page: params.page, q: params.q, limit });
  const changeStatus = useChangeItemStatus();
  const [editing, setEditing] = useState(/** @type {Item | null} */ (null));
  const [toggling, setToggling] = useState(/** @type {Item | null} */ (null));

  const toggleStatus = () => {
    if (!toggling) return;
    changeStatus.mutate(toggling, {
      onSuccess: () => {
        toast.success('Status task berhasil diubah.');
        setToggling(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  const actions = (/** @type {Item} */ item) => (
    <MasterRowActions
      status={item.status}
      name={item.name}
      onEdit={() => setEditing(item)}
      onToggleStatus={() => setToggling(item)}
    />
  );
  const badge = (/** @type {Item} */ item) => (
    <StatusBadge status={MASTER_STATUS_BADGES[item.status]} />
  );

  const columns = [
    {
      id: 'name',
      header: 'Nama',
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      id: 'description',
      header: 'Deskripsi',
      meta: { hideBelow: 'lg' },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.description || '—'}</span>
      ),
    },
    { id: 'status', header: 'Status', cell: ({ row }) => badge(row.original) },
    {
      id: 'actions',
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => actions(row.original),
    },
  ];

  return (
    <>
      <FilterBar
        search={params.q}
        onSearchChange={(q) => setFilters({ q })}
        searchPlaceholder="Cari nama task"
      />

      {query.isPending ? <ListSkeleton /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.isSuccess && query.data.data.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Belum ada master task"
          description="Ubah pencarian, atau tambahkan task baru."
        />
      ) : null}
      {query.isSuccess && query.data.data.length > 0 ? (
        <ResponsiveList
          data={query.data.data}
          columns={columns}
          getRowId={(item) => item.id}
          caption="Daftar master task"
          cardGridClassName="sm:grid-cols-2"
          renderCard={(item) => (
            <article className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-lg font-semibold text-foreground">{item.name}</p>
                {badge(item)}
              </div>
              {item.description ? (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              ) : null}
              {actions(item)}
            </article>
          )}
          footer={
            <Pagination
              page={query.data.page}
              limit={query.data.limit}
              total={query.data.total}
              count={query.data.data.length}
              noun="task"
              onPageChange={setPage}
            />
          }
        />
      ) : null}

      <ItemFormDialog
        open={createOpen || Boolean(editing)}
        item={editing}
        onClose={() => {
          setEditing(null);
          onCreateClose();
        }}
      />
      <StatusChangeDialog
        target={toggling}
        entityLabel="task"
        pending={changeStatus.isPending}
        onConfirm={toggleStatus}
        onClose={() => setToggling(null)}
      />
    </>
  );
}
