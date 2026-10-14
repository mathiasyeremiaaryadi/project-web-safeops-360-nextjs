import { StatusBadge } from '@/components/shared/status-badge';
import { ROLE_BADGES, USER_STATUS_BADGES } from '@/features/users/constants';
import { getUserStatus } from '@/features/users/lib/get-user-status';

/** @param {{ roles: string[] }} props */
export function RoleBadges({ roles }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <StatusBadge
          key={role}
          status={ROLE_BADGES[/** @type {keyof typeof ROLE_BADGES} */ (role)]}
          fallback={role}
        />
      ))}
    </span>
  );
}

/** @param {{ user: import('@/features/users/api/schemas').User }} props */
export function UserStatusBadge({ user }) {
  return <StatusBadge status={USER_STATUS_BADGES[getUserStatus(user)]} />;
}
