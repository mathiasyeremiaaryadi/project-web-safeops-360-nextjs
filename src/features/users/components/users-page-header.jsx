'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { useSiteContext } from '@/hooks/use-site-context';
import { can } from '@/lib/auth/permissions';
import { ROLE_LABELS, ROLES } from '@/lib/constants';
import { useSession } from '@/features/auth';
import { managedRoleOf } from '@/features/users/lib/managed-role';

/** "Tambah user" (Super Admin) or "Tambah Admin Worker" / "Tambah Worker". @param {any} user */
const addLabel = (user) => {
  const role = managedRoleOf(user);
  return can(user, 'USER_ACCESS_ADMIN') || !role
    ? 'Tambah user'
    : `Tambah ${ROLE_LABELS[/** @type {keyof typeof ROLE_LABELS} */ (role)]}`;
};

/**
 * Header of `/users` ("Manajemen user"): Super Admin manages every account, an Admin the Admin
 * Worker accounts of vendors at their sites, an Admin vendor the Worker accounts of their vendor.
 */
export function UsersPageHeader() {
  const { user } = useSession();
  const site = useSiteContext();
  const manageAccess = can(user, 'USER_ACCESS_ADMIN');
  const managedRole = managedRoleOf(user);

  return (
    <PageHeader
      title="Manajemen user"
      description={
        manageAccess
          ? 'Kelola akun, role, dan scope site/vendor.'
          : managedRole === ROLES.ADMIN_WORKER
            ? `Akun Admin Worker vendor di ${site.shortLabel}.`
            : `Akun worker ${site.shortLabel}.`
      }
      actions={
        <Link
          href="/users/new"
          className={buttonVariants({ className: 'h-11 px-5 text-base font-semibold' })}
        >
          <Plus aria-hidden="true" className="size-5" />
          {addLabel(user)}
        </Link>
      }
    />
  );
}

/** Header of `/users/new`. */
export function NewUserPageHeader() {
  const { user } = useSession();
  return (
    <PageHeader
      title={addLabel(user)}
      description="Akun baru wajib mengganti password saat login pertama."
    />
  );
}
