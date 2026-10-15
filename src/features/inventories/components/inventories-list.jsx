'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsString } from 'nuqs';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { FilterBar } from '@/components/shared/filter-bar';
import { LookupFilter } from '@/components/shared/lookup-filter';
import { QueryList } from '@/components/shared/query-list';
import { StatusTabs } from '@/components/shared/status-tabs';
import { useListParams } from '@/hooks/use-list-params';
import { useSiteContext } from '@/hooks/use-site-context';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { can } from '@/lib/auth/permissions';
import { formatDate } from '@/lib/date';
import { filterRows, searchRows } from '@/lib/search';
import { useSession } from '@/features/auth';
import { useInventories } from '@/features/inventories/api/queries';
import { ConditionBadge } from '@/features/inventories/components/condition-badge';
import { InventoryFormDialog } from '@/features/inventories/components/inventory-form-dialog';
import { InventoryItemCell } from '@/features/inventories/components/inventory-item-cell';
import { CONDITION_FILTERS } from '@/features/inventories/lib/constants';

const FILTERS = {
  status_condition: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  vendor_id: parseAsString.withDefault(''),
};

const columns = [
  {
    id: 'item',
    header: 'Item',
    meta: { sortValue: (/** @type {any} */ r) => r.item },
    cell: ({ row }) => <InventoryItemCell inventory={row.original} table />,
  },
  {
    id: 'type',
    header: 'Jenis',
    meta: { hideBelow: 'lg', sortValue: (/** @type {any} */ r) => r.jenis_item },
    cell: ({ row }) => row.original.jenis_item || '—',
  },
  {
    id: 'qty',
    header: 'Jumlah',
    meta: { sortValue: (/** @type {any} */ r) => r.qty },
    cell: ({ row }) => <span className="tabular-nums">{row.original.qty}</span>,
  },
  {
    id: 'condition',
    header: 'Kondisi',
    meta: { sortValue: (/** @type {any} */ r) => r.status_condition },
    cell: ({ row }) => <ConditionBadge value={row.original.status_condition} />,
  },
  {
    id: 'updated',
    header: 'Diperbarui',
    meta: { hideBelow: 'xl', sortValue: (/** @type {any} */ r) => r.updated_at },
    cell: ({ row }) => formatDate(row.original.updated_at),
  },
];

/** `/inventories` — condition chips, site/vendor filters, search. */
export function InventoriesList() {
  const router = useRouter();
  const { user } = useSession();
  const { params, limit, setFilters, setPage } = useListParams(FILTERS);
  const site = useSiteContext();
  const query = useInventories({ ...params, site_id: site.siteIdFor(params.site_id), limit });
  const vendors = useOptionLabels('vendors');
  const [creating, setCreating] = useState(false);
  // Server `?q=` + the same search here, in case the backend ignores `q`.
  const rows = query.data
    ? searchRows(
        filterRows(query.data.data, {
          status_condition: params.status_condition,
          vendor_id: params.vendor_id,
        }),
        params.q,
        (r) => [r.item, r.jenis_item, vendors.labelOf(r.vendor_id)],
      )
    : [];

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Peralatan milik vendor beserta jumlah dan kondisinya."
        actions={
          can(user, 'INVENTORY_POLICY_WRITE') ? (
            <Button
              type="button"
              className="h-11 px-5 text-base font-semibold"
              onClick={() => setCreating(true)}
            >
              <Plus aria-hidden="true" className="size-5" />
              Tambah inventory
            </Button>
          ) : null
        }
      />

      <StatusTabs
        label="Filter kondisi"
        options={CONDITION_FILTERS}
        value={params.status_condition}
        onChange={(value) => setFilters({ status_condition: value })}
      />
      <FilterBar
        className="mb-3"
        search={params.q}
        onSearchChange={(q) => setFilters({ q })}
        searchPlaceholder="Cari item, jenis, atau vendor"
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        {site.showSiteFilter ? (
          <LookupFilter
            lookup="sites"
            value={params.site_id}
            onChange={(site_id) => setFilters({ site_id })}
            placeholder="Semua site"
            ariaLabel="Filter site"
          />
        ) : null}
        {site.showVendorFilter ? (
          <LookupFilter
            lookup="vendors"
            params={
              site.siteIdFor(params.site_id)
                ? { site_id: site.siteIdFor(params.site_id) }
                : undefined
            }
            value={params.vendor_id}
            onChange={(vendor_id) => setFilters({ vendor_id })}
            placeholder="Semua vendor"
            ariaLabel="Filter vendor"
          />
        ) : null}
      </div>

      <QueryList
        query={query}
        rows={rows}
        empty={{
          icon: Package,
          title: 'Belum ada inventory',
          description: 'Ubah filter, atau tambahkan inventory baru.',
        }}
        noun="inventory"
        onPageChange={setPage}
        columns={columns}
        getRowId={(r) => r.id}
        caption="Daftar inventory"
        cardGridClassName="sm:grid-cols-2"
        onRowClick={(r) => router.push(`/inventories/${r.id}`)}
        renderCard={(r) => (
          <Link
            href={`/inventories/${r.id}`}
            className="flex items-center gap-3 rounded-2xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <InventoryItemCell inventory={r} />
            <span className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
              <ConditionBadge value={r.status_condition} />
              <span className="text-sm text-muted-foreground tabular-nums">{r.qty} unit</span>
            </span>
          </Link>
        )}
      />

      <InventoryFormDialog open={creating} inventory={null} onClose={() => setCreating(false)} />
    </>
  );
}
