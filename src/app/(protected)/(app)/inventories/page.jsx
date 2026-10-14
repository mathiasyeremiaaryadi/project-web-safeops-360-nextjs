import { InventoriesList } from '@/features/inventories';

export const metadata = { title: 'Inventory' };

/** `/inventories` */
export default function InventoriesPage() {
  return <InventoriesList />;
}
