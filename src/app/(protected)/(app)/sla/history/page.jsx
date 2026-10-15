import { SlaHistory } from '@/features/sla-results';

export const metadata = { title: 'Riwayat & tren SLA' };

/** `/sla/history?scope=&vendor_id=&site_id=&worker_id=&range=` */
export default function SlaHistoryPage() {
  return <SlaHistory />;
}
