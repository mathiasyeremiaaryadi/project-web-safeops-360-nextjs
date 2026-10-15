import { ReportInventoryView } from '@/features/my-inventory-reports';

export const metadata = { title: 'Lapor inventory' };

/** `/inventory-reports/new` — the Worker reports equipment needs or damage. */
export default function NewInventoryReportPage() {
  return <ReportInventoryView />;
}
