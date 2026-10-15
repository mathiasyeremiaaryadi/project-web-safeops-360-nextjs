import { SlaDashboard } from '@/features/sla-results';

export const metadata = { title: 'SLA & maturity' };

/** `/sla` — current period of the vendors / sites / workers in scope. */
export default function SlaPage() {
  return <SlaDashboard />;
}
