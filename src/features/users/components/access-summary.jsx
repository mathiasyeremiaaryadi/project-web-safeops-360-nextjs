'use client';

import { useWatch } from 'react-hook-form';
import { describeAccess } from '@/lib/auth/permissions';
import { RoleBadges } from '@/features/users/components/user-badges';

/**
 * "Ringkasan akses" panel (≥ 1280px). Texts come from the permission matrix
 * (lib/auth/permissions.js), not written by hand.
 * @param {{ control: import('react-hook-form').Control<any> }} props
 */
export function AccessSummary({ control }) {
  const [roles, vendor, sites] = useWatch({ control, name: ['roles', 'vendor', 'sites'] });
  const selectedRoles = /** @type {string[]} */ (roles ?? []);
  const { allowed, denied } = describeAccess(selectedRoles);

  return (
    <aside aria-labelledby="access-summary-title" className="rounded-2xl border bg-card p-5">
      <h2 id="access-summary-title" className="text-lg font-semibold text-foreground">
        Ringkasan akses
      </h2>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted-foreground">Role</dt>
          <dd>{selectedRoles.length ? <RoleBadges roles={selectedRoles} /> : '—'}</dd>
        </div>
        {vendor ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Vendor</dt>
            <dd className="text-right font-medium">{vendor.label}</dd>
          </div>
        ) : null}
        {sites?.length ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Site</dt>
            <dd className="text-right font-medium">{sites.map((site) => site.label).join(', ')}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Login pertama</dt>
          <dd className="font-medium">Wajib ganti password</dd>
        </div>
      </dl>
      {selectedRoles.length ? (
        <div className="mt-4 border-t pt-4 text-sm">
          <p className="font-semibold text-foreground">User ini bisa</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {allowed.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <p className="mt-3 font-semibold text-foreground">User ini tidak bisa</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {denied.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
