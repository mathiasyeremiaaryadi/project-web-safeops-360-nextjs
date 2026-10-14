import { InventoryReportsList } from '@/features/inventory-reports';

export const metadata = { title: 'Laporan inventory' };

/** `/reports/inventory` */
export default function InventoryReportsPage() {
  return <InventoryReportsList />;
}
