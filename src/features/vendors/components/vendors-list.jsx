'use client';

import { useState } from 'react';
import { Truck } from 'lucide-react';
import { FilterBar } from '@/components/shared/filter-bar';
import { MasterRowActions } from '@/components/shared/master-row-actions';
import { QueryList } from '@/components/shared/query-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusChangeDialog } from '@/components/shared/status-change-dialog';
import { useListParams } from '@/hooks/use-list-params';
import { useSiteContext } from '@/hooks/use-site-context';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { searchRows } from '@/lib/search';
import { MASTER_STATUS_BADGES } from '@/lib/constants';
import { useChangeVendorStatus } from '@/features/vendors/api/mutations';
import { useVendors } from '@/features/vendors/api/queries';
import { VendorFormDialog } from '@/features/vendors/components/vendor-form-dialog';

/** @typedef {import('@/features/vendors/api/schemas').Vendor} Vendor */

/** @param {{ ids: string[], siteName: (id: string) => string }} props */
function SiteChips({ ids, siteName }) {
  if (ids.length === 0)
    return (
      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        Belum ada site
      </span>
    );
  return (
    <span className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <span key={id} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">
          {siteName(id)}
        </span>
      ))}
    </span>
  );
}

/**
 * "Vendor" tab of /master.
 * @param {{ canEdit: boolean, createOpen: boolean, onCreateClose: () => void }} props
 *   `canEdit`: show add/edit/deactivate (an Admin only reads).
 */
export function VendorsList({ canEdit, createOpen, onCreateClose }) {
  const { params, limit, setFilters, setPage } = useListParams();
  const site = useSiteContext();
  const query = useVendors({
    page: params.page,
    q: params.q,
    site_id: site.siteIdFor(),
    limit,
  });
  const sites = useOptionLabels('sites');
  // Server `?q=` + the same search here, in case the backend ignores `q`.
  const rows = query.data
    ? searchRows(query.data.data, params.q, (vendor) => [
        vendor.code,
        vendor.name,
        ...vendor.site_ids.map(sites.labelOf),
      ])
    : [];
  const changeStatus = useChangeVendorStatus();
  const [editing, setEditing] = useState(/** @type {Vendor | null} */ (null));
  const [toggling, setToggling] = useState(/** @type {Vendor | null} */ (null));

  const actions = (/** @type {Vendor} */ vendor) =>
    canEdit ? (
      <MasterRowActions
        status={vendor.status}
        name={vendor.name}
        onEdit={() => setEditing(vendor)}
        onToggleStatus={() => setToggling(vendor)}
      />
    ) : null;
  const badge = (/** @type {Vendor} */ vendor) => (
    <StatusBadge status={MASTER_STATUS_BADGES[vendor.status]} />
  );

  const columns = [
    {
      id: 'code',
      meta: { sortValue: (vendor) => vendor.code },
      header: 'Kode',
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{row.original.code}</span>
      ),
    },
    {
      id: 'name',
      meta: { sortValue: (vendor) => vendor.name },
      header: 'Vendor',
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      id: 'sites',
      meta: { sortValue: (vendor) => vendor.site_ids.map(sites.labelOf).join(', ') },
      header: 'Site',
      cell: ({ row }) => <SiteChips ids={row.original.site_ids} siteName={sites.labelOf} />,
    },
    {
      id: 'status',
      meta: { sortValue: (vendor) => vendor.status },
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
        searchPlaceholder="Cari kode atau nama vendor"
      />

      <QueryList
        query={query}
        rows={rows}
        empty={{
          icon: Truck,
          title: 'Belum ada vendor',
          description: 'Ubah pencarian, atau tambahkan vendor baru.',
        }}
        noun="vendor"
        onPageChange={setPage}
        columns={columns}
        getRowId={(vendor) => vendor.id}
        caption="Daftar vendor"
        cardGridClassName="sm:grid-cols-2"
        renderCard={(vendor) => (
          <article className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-muted-foreground">{vendor.code}</span>
              {badge(vendor)}
            </div>
            <p className="text-lg font-semibold text-foreground">{vendor.name}</p>
            <SiteChips ids={vendor.site_ids} siteName={sites.labelOf} />
            {actions(vendor)}
          </article>
        )}
      />

      <VendorFormDialog
        open={createOpen || Boolean(editing)}
        vendor={editing}
        siteName={sites.labelOf}
        onClose={() => {
          setEditing(null);
          onCreateClose();
        }}
      />
      <StatusChangeDialog
        target={toggling}
        entityLabel="vendor"
        mutation={changeStatus}
        onClose={() => setToggling(null)}
      />
    </>
  );
}
