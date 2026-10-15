'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { FilterBar } from '@/components/shared/filter-bar';
import { MasterRowActions } from '@/components/shared/master-row-actions';
import { QueryList } from '@/components/shared/query-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusChangeDialog } from '@/components/shared/status-change-dialog';
import { useListParams } from '@/hooks/use-list-params';
import { searchRows } from '@/lib/search';
import { MASTER_STATUS_BADGES } from '@/lib/constants';
import { useChangeSiteStatus } from '@/features/sites/api/mutations';
import { useSites } from '@/features/sites/api/queries';
import { SiteFormDialog } from '@/features/sites/components/site-form-dialog';

/** @typedef {import('@/features/sites/api/schemas').Site} Site */

/**
 * "Site" tab of /master.
 * @param {{ canEdit: boolean, createOpen: boolean, onCreateClose: () => void }} props
 *   `canEdit`: show add/edit/deactivate (an Admin only reads); `createOpen`: the page's
 *   "Tambah site" button was clicked.
 */
export function SitesList({ canEdit, createOpen, onCreateClose }) {
  const { params, limit, setFilters, setPage } = useListParams();
  const query = useSites({ page: params.page, q: params.q, limit });
  // Server `?q=` + the same search here, in case the backend ignores `q`.
  const rows = query.data
    ? searchRows(query.data.data, params.q, (site) => [site.code, site.name, site.site_type])
    : [];
  const changeStatus = useChangeSiteStatus();
  const [editing, setEditing] = useState(/** @type {Site | null} */ (null));
  const [toggling, setToggling] = useState(/** @type {Site | null} */ (null));

  /** @param {Site} site */
  const actions = (site) =>
    canEdit ? (
      <MasterRowActions
        status={site.status}
        name={site.name}
        onEdit={() => setEditing(site)}
        onToggleStatus={() => setToggling(site)}
      />
    ) : null;
  const badge = (/** @type {Site} */ site) => (
    <StatusBadge status={MASTER_STATUS_BADGES[site.status]} />
  );

  const columns = [
    {
      id: 'code',
      meta: { sortValue: (site) => site.code },
      header: 'Kode',
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{row.original.code}</span>
      ),
    },
    {
      id: 'name',
      meta: { sortValue: (site) => site.name },
      header: 'Nama',
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      id: 'type',
      meta: { sortValue: (site) => site.site_type },
      header: 'Tipe',
      cell: ({ row }) => row.original.site_type || '—',
    },
    {
      id: 'status',
      meta: { sortValue: (site) => site.status },
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
        searchPlaceholder="Cari kode atau nama site"
      />

      <QueryList
        query={query}
        rows={rows}
        empty={{
          icon: Building2,
          title: 'Belum ada site',
          description: 'Ubah pencarian, atau tambahkan site baru.',
        }}
        noun="site"
        onPageChange={setPage}
        columns={columns}
        getRowId={(site) => site.id}
        caption="Daftar site"
        cardGridClassName="sm:grid-cols-2"
        renderCard={(site) => (
          <article className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-muted-foreground">{site.code}</span>
              {badge(site)}
            </div>
            <p className="text-lg font-semibold text-foreground">{site.name}</p>
            <p className="text-sm text-muted-foreground">{site.site_type || 'Tipe belum diisi'}</p>
            {actions(site)}
          </article>
        )}
      />

      <SiteFormDialog
        open={createOpen || Boolean(editing)}
        site={editing}
        onClose={() => {
          setEditing(null);
          onCreateClose();
        }}
      />
      <StatusChangeDialog
        target={toggling}
        entityLabel="site"
        mutation={changeStatus}
        onClose={() => setToggling(null)}
      />
    </>
  );
}
