import { AssignmentsList } from '@/features/assignments';

export const metadata = { title: 'Penugasan worker' };

/** `/assignments` — workers assigned to pipeline tasks (Admin vendor). */
export default function AssignmentsPage() {
  return <AssignmentsList />;
}
