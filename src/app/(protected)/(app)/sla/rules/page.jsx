import { RulesView } from '@/features/sla-rules';

export const metadata = { title: 'Pengaturan SLA' };

/** `/sla/rules` — active SLA and maturity rules. */
export default function SlaRulesPage() {
  return <RulesView />;
}
