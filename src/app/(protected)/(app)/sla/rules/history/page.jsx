import { RuleHistoryView } from '@/features/sla-rules';

export const metadata = { title: 'Riwayat aturan' };

/** `/sla/rules/history?type=&vendor_id=&site_id=` */
export default function SlaRuleHistoryPage() {
  return <RuleHistoryView />;
}
