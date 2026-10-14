'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { isNotFound, NotFoundState } from '@/components/shared/not-found-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusChangeDialog } from '@/components/shared/status-change-dialog';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { can } from '@/lib/auth/permissions';
import { formatDateTime } from '@/lib/date';
import { MASTER_STATUS, MASTER_STATUS_BADGES } from '@/lib/constants';
import { useSession } from '@/features/auth';
import { useChangeInventoryStatus } from '@/features/inventories/api/mutations';
import { useInventory } from '@/features/inventories/api/queries';
import { ConditionBadge } from '@/features/inventories/components/condition-badge';
import { InventoryFormDialog } from '@/features/inventories/components/inventory-form-dialog';
import { InventoryPhoto } from '@/features/inventories/components/inventory-photo';

/** `/inventories/[id]` body: photo, data, Edit and Nonaktifkan. @param {{ id: string }} props */
export function InventoryDetail({ id }) {
  const query = useInventory(id);
  const { user } = useSession();
  const vendors = useOptionLabels('vendors');
  const changeStatus = useChangeInventoryStatus(id);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (query.isPending) return <ListSkeleton rows={3} />;
  if (query.isError && isNotFound(query.error)) {
    return (
      <NotFoundState
        description="Inventory ini tidak ada atau di luar akses Anda."
        backHref="/inventories"
        backLabel="Kembali ke daftar inventory"
      />
    );
  }
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const inventory = query.data;
  const vendorName = vendors.labelOf(inventory.vendor_id);
  const active = inventory.status === MASTER_STATUS.ACTIVE;
  const facts = [
    ['Vendor', vendorName],
    ['Jenis item', inventory.jenis_item || '—'],
    ['Jumlah', `${inventory.qty} unit`],
    ['Kondisi', <ConditionBadge key="c" value={inventory.status_condition} />],
    ['Status', <StatusBadge key="s" status={MASTER_STATUS_BADGES[inventory.status]} />],
    ['Diperbarui', formatDateTime(inventory.updated_at)],
  ];

  return (
    <>
      <PageHeader title={inventory.item} />
      <section className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <InventoryPhoto
          url={inventory.image_url}
          alt={inventory.item}
          className="aspect-square w-full"
        />
        <div className="min-w-0">
          <p className="text-xl font-semibold text-foreground md:sr-only">{inventory.item}</p>
          <dl className="mt-2 grid gap-x-6 gap-y-4 sm:grid-cols-2 md:mt-0">
            {facts.map(([label, value]) => (
              <div key={/** @type {string} */ (label)} className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          {can(user, 'INVENTORY_POLICY_WRITE') ? (
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 bg-card"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                className={active ? 'h-11 bg-card text-danger hover:text-danger' : 'h-11 bg-card'}
                onClick={() => setConfirming(true)}
              >
                {active ? 'Nonaktifkan' : 'Aktifkan'}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <InventoryFormDialog
        open={editing}
        inventory={inventory}
        vendorName={vendorName}
        onClose={() => setEditing(false)}
      />
      <StatusChangeDialog
        target={confirming ? inventory : null}
        name={inventory.item}
        entityLabel="inventory"
        mutation={changeStatus}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
