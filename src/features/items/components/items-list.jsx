'use client';

import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { FilterBar } from '@/components/shared/filter-bar';
import { MasterRowActions } from '@/components/shared/master-row-actions';
import { QueryList } from '@/components/shared/query-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusChangeDialog } from '@/components/shared/status-change-dialog';
import { useListParams } from '@/hooks/use-list-params';
import { useSiteContext } from '@/hooks/use-site-context';
import { searchRows } from '@/lib/search';
import { MASTER_STATUS_BADGES } from '@/lib/constants';
import { useChangeItemStatus } from '@/features/items/api/mutations';
import { useItems } from '@/features/items/api/queries';
import { ItemFormDialog } from '@/features/items/components/item-form-dialog';

/** @typedef {import('@/features/items/api/schemas').Item} Item */

/**
 * "Master task" tab of /master.
 * @param {{ canEdit: boolean, createOpen: boolean, onCreateClose: () => void }} props
 *   `canEdit`: show add/edit/deactivate (an Admin only reads).
 */
export function ItemsList({ canEdit, createOpen, onCreateClose }) {
  const { params, limit, setFilters, setPage } = useListParams();
  const site = useSiteContext();
  // status=ALL: an inactive master task stays listed, so it can be reactivated.
  const query = useItems({
    page: params.page,
    q: params.q,
    site_id: site.siteIdFor(),
    limit,
    status: 'ALL',
  });
  // Server `?q=` + the same search here, in case the backend ignores `q`.
  const rows = query.data
    ? searchRows(query.data.data, params.q, (item) => [item.name, item.description])
    : [];
  const changeStatus = useChangeItemStatus();
  const [editing, setEditing] = useState(/** @type {Item | null} */ (null));
  const [toggling, setToggling] = useState(/** @type {Item | null} */ (null));

  const actions = (/** @type {Item} */ item) =>
    canEdit ? (
      <MasterRowActions
        status={item.status}
        name={item.name}
        onEdit={() => setEditing(item)}
        onToggleStatus={() => setToggling(item)}
      />
    ) : null;
  const badge = (/** @type {Item} */ item) => (
    <StatusBadge status={MASTER_STATUS_BADGES[item.status]} />
  );

  const columns = [
    {
      id: 'name',
      meta: { sortValue: (item) => item.name },
      header: 'Nama',
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      id: 'description',
      header: 'Deskripsi',
      meta: { hideBelow: 'lg', sortValue: (item) => item.description },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.description || '—'}</span>
      ),
    },
    {
      id: 'status',
      meta: { sortValue: (item) => item.status },
      header: 'Status',
      cell: ({ row }) => badge(row.original),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => actions(row.original),
    },
  ].filter((column) => canEdit || column.id !== 'actions');

  return (
    <>
      <FilterBar
        search={params.q}
        onSearchChange={(q) => setFilters({ q })}
        searchPlaceholder="Cari nama task"
      />

      <QueryList
        query={query}
        rows={rows}
        empty={{
          icon: ListChecks,
          title: 'Belum ada master task',
          description: 'Ubah pencarian, atau tambahkan task baru.',
        }}
        noun="task"
        onPageChange={setPage}
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
      />

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
        mutation={changeStatus}
        onClose={() => setToggling(null)}
      />
    </>
  );
}
