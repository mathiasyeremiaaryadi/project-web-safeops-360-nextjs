'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ConditionBadge, useInventory } from '@/features/inventories';

/**
 * The inventory a report refers to, with its current condition. Falls back to the name sent
 * with the report when the inventory cannot be loaded (e.g. out of scope).
 * @param {{ inventoryId: string, fallbackName?: string | null }} props
 */
export function LinkedInventory({ inventoryId, fallbackName }) {
  const query = useInventory(inventoryId);

  if (query.isPending) return <Skeleton className="h-6 w-48" />;
  if (query.isError) return <p className="text-foreground">{fallbackName ?? '—'}</p>;

  const inventory = query.data;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/inventories/${inventory.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {inventory.item}
      </Link>
      <span className="text-sm text-muted-foreground">{inventory.qty} unit</span>
      <ConditionBadge value={inventory.status_condition} />
    </div>
  );
}
