import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { MASTER_STATUS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { InventoryPhoto } from '@/features/inventories/components/inventory-photo';

/**
 * Photo (44px) + item name, with the type under the name.
 * @param {object} props
 * @param {import('@/features/inventories/api/schemas').Inventory} props.inventory
 * @param {boolean} [props.table] In the table: the name is a link and the type is hidden from lg
 *   (it has its own column there). On a card the whole card is the link.
 */
export function InventoryItemCell({ inventory, table = false }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <InventoryPhoto url={inventory.image_url} alt={inventory.item} className="size-11" />
      <span className="flex min-w-0 flex-col">
        <span className="flex flex-wrap items-center gap-2">
          {table ? (
            <Link
              href={`/inventories/${inventory.id}`}
              className="font-semibold text-foreground hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {inventory.item}
            </Link>
          ) : (
            <span className="font-semibold text-foreground">{inventory.item}</span>
          )}
          {inventory.status === MASTER_STATUS.INACTIVE ? (
            <Badge variant="neutral">Nonaktif</Badge>
          ) : null}
        </span>
        {inventory.jenis_item ? (
          <span className={cn('text-sm text-muted-foreground', table && 'lg:hidden')}>
            {inventory.jenis_item}
          </span>
        ) : null}
      </span>
    </span>
  );
}
