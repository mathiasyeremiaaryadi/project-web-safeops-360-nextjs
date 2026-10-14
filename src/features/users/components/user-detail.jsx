'use client';

import { UserX } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { isNotFound, NotFoundState } from '@/components/shared/not-found-state';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { useSession } from '@/features/auth';
import { useUser } from '@/features/users/api/queries';
import { UserAccessCard } from '@/features/users/components/user-access-card';
import { RoleBadges, UserStatusBadge } from '@/features/users/components/user-badges';
import { UserDangerZone } from '@/features/users/components/user-danger-zone';
import { UserProfileCard } from '@/features/users/components/user-profile-card';
import { formatDateTime } from '@/lib/date';

/** `/users/[id]` body. @param {{ id: string }} props */
export function UserDetail({ id }) {
  const query = useUser(id);
  const { user: currentUser } = useSession();
  const sites = useOptionLabels('sites');
  const vendors = useOptionLabels('vendors');

  if (query.isPending || sites.isLoading || vendors.isLoading) return <ListSkeleton rows={3} />;
  if (query.isError && isNotFound(query.error)) {
    return (
      <NotFoundState
        icon={UserX}
        description="User ini tidak ada atau di luar akses Anda."
        backHref="/users"
        backLabel="Kembali ke daftar user"
      />
    );
  }
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const user = query.data;
  return (
    <>
      <PageHeader
        title={user.full_name || user.username}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">@{user.username}</span>
            <RoleBadges roles={user.roles} />
            <UserStatusBadge user={user} />
            <span>· Login terakhir {formatDateTime(user.last_login_at)}</span>
          </span>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
        <div className="flex flex-col gap-4 lg:gap-5">
          <UserProfileCard user={user} />
          <UserDangerZone user={user} isSelf={currentUser?.id === user.id} />
        </div>
        <UserAccessCard user={user} siteName={sites.labelOf} vendorName={vendors.labelOf} />
      </div>
    </>
  );
}
