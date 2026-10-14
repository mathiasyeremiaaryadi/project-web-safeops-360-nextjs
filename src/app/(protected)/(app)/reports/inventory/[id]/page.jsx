import { InventoryReportPage } from '@/features/inventory-reports';

export const metadata = { title: 'Detail laporan inventory' };

/**
 * `/reports/inventory/[id]`
 * @param {{ params: Promise<{ id: string }> }} props
 */
export default async function InventoryReportDetailPage({ params }) {
  const { id } = await params;
  return <InventoryReportPage id={id} />;
}
