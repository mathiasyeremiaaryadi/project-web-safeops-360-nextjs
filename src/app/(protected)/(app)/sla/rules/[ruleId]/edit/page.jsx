import { RuleFormPage } from '@/features/sla-rules';

export const metadata = { title: 'Edit aturan' };

/**
 * `/sla/rules/[ruleId]/edit?type=` — posts a new version (or read-only with `view=1`).
 * @param {{ params: Promise<{ ruleId: string }> }} props
 */
export default async function EditSlaRulePage({ params }) {
  const { ruleId } = await params;
  return <RuleFormPage ruleId={ruleId} />;
}
