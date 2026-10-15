import { SlaDetail } from '@/features/sla-results';

export const metadata = { title: 'Rincian SLA' };

/** `/sla/detail?scope=&vendor_id=&site_id=&worker_id=&period_start=` */
export default function SlaDetailPage() {
  return <SlaDetail />;
}
