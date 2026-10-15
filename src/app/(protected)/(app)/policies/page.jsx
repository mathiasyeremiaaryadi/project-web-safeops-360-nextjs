import { PoliciesView } from '@/features/policies';

export const metadata = { title: 'SOP' };

/** `/policies` — table for managers, cards for workers. */
export default function PoliciesPage() {
  return <PoliciesView />;
}
