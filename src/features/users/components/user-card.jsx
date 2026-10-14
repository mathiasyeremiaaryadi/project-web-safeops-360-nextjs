import Link from 'next/link';
import { getInitials } from '@/components/layout/user-avatar';
import { RoleBadges, UserStatusBadge } from '@/features/users/components/user-badges';

/**
 * Avatar, name and @username (table cell).
 * @param {{ user: import('@/features/users/api/schemas').User }} props
 */
export function UserIdentity({ user }) {
  const name = user.full_name || user.username;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
      >
        {getInitials(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{name}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">@{user.username}</p>
      </div>
    </div>
  );
}

/**
 * Mobile card of a user (links to the detail page).
 * @param {object} props
 * @param {import('@/features/users/api/schemas').User} props.user
 * @param {string} props.scopeText
 */
export function UserCard({ user, scopeText }) {
  const name = user.full_name || user.username;
  return (
    <Link
      href={`/users/${user.id}`}
      className="flex gap-3 rounded-2xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
      >
        {getInitials(name)}
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="min-w-0">
          <span className="block truncate font-semibold text-foreground">{name}</span>
          <span className="block truncate font-mono text-sm text-muted-foreground">
            @{user.username}
          </span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          <RoleBadges roles={user.roles} />
          <UserStatusBadge user={user} />
        </span>
        <span className="text-sm text-muted-foreground">{scopeText}</span>
      </span>
    </Link>
  );
}
