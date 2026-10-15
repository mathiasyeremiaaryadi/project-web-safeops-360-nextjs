'use client';

import dynamic from 'next/dynamic';
import { ListSkeleton } from '@/components/shared/list-states';
import { can } from '@/lib/auth/permissions';
import { useSession } from '@/features/auth';
import { PolicyCards } from '@/features/policies/components/policy-cards';

// Loaded only for the managers' table view, so the Worker never downloads the table code.
const PoliciesList = dynamic(
  () => import('@/features/policies/components/policies-list').then((m) => m.PoliciesList),
  { loading: () => <ListSkeleton rows={5} /> },
);

/** `/policies`: cards for workers (who fill in task reports), the admin table for the others. */
export function PoliciesView() {
  const { user } = useSession();
  if (!user) return <ListSkeleton rows={5} />;
  return can(user, 'TASK_REPORT_WRITE') ? <PolicyCards /> : <PoliciesList />;
}
