'use client';

import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/layout/user-avatar';
import { useSiteContext } from '@/hooks/use-site-context';
import { useSession } from '@/features/auth';
import { formatDateTime } from '@/lib/date';
import { can, DATA_SCOPE } from '@/lib/auth/permissions';
import { ROLE_LABELS } from '@/lib/constants';

/**
 * Scope summary of the signed-in user.
 * @param {{ roles: string[], scopes: { site_ids: string[], vendor_ids: string[] } }} user
 */
function describeScope(user) {
  if (can(user, 'ALL_SITES_READ')) return 'Semua site dan vendor';
  const parts = [];
  if (user.scopes.site_ids.length) parts.push(`${user.scopes.site_ids.length} site`);
  if (user.scopes.vendor_ids.length) parts.push(`${user.scopes.vendor_ids.length} vendor`);
  return parts.join(' · ') || 'Belum ada scope';
}

/** @param {{ label: string, children: import('react').ReactNode }} props */
function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 text-[15px] sm:text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

/** Profile of the signed-in user (from `/auth/me`). */
export function ProfileCard() {
  const { user } = useSession();
  const site = useSiteContext();
  if (!user) return null;
  const name = user.full_name ?? user.username;

  return (
    <section aria-labelledby="profile-name" className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <UserAvatar name={name} size="lg" className="bg-brand-dark" />
        <div className="min-w-0">
          <h2 id="profile-name" className="truncate text-xl font-semibold text-foreground">
            {name}
          </h2>
          <p className="truncate font-mono text-sm text-muted-foreground">@{user.username}</p>
        </div>
      </div>
      <dl className="mt-5">
        <Row label="Role">
          <span className="flex flex-wrap gap-1.5">
            {user.roles.map((role) => (
              <Badge key={role} variant="dark">
                {ROLE_LABELS[role] ?? role}
              </Badge>
            ))}
          </span>
        </Row>
        {site.mode === DATA_SCOPE.VENDOR ? <Row label="Vendor">{site.shortLabel}</Row> : null}
        <Row label="Scope">
          {site.mode !== DATA_SCOPE.ALL && site.sites.length > 0 ? (
            <span className="flex flex-wrap gap-1.5" aria-label="Site yang dikelola">
              {site.sites.map((option) => (
                <Badge key={option.value} variant="info">
                  {option.label}
                </Badge>
              ))}
            </span>
          ) : (
            describeScope(user)
          )}
        </Row>
        <Row label="Email">{user.email || '—'}</Row>
        <Row label="Login terakhir">{formatDateTime(user.last_login_at)}</Row>
      </dl>
    </section>
  );
}
