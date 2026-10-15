import { RuleFormPage } from '@/features/sla-rules';

export const metadata = { title: 'Buat aturan' };

/** `/sla/rules/new?type=&vendor_id=&site_id=` */
export default function NewSlaRulePage() {
  return <RuleFormPage />;
}
