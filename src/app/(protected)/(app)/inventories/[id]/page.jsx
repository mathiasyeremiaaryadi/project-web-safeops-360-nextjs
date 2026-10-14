import { InventoryDetail } from '@/features/inventories';

export const metadata = { title: 'Detail inventory' };

/**
 * `/inventories/[id]`
 * @param {{ params: Promise<{ id: string }> }} props
 */
export default async function InventoryDetailPage({ params }) {
  const { id } = await params;
  return <InventoryDetail id={id} />;
}
