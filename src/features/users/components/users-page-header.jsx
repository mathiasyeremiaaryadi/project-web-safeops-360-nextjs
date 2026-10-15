'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { useSiteContext } from '@/hooks/use-site-context';
import { can } from '@/lib/auth/permissions';
import { useSession } from '@/features/auth';

/**
 * Header of `/users`: "Manajemen user" for Super Admin, "Akun worker" for an Admin vendor (who
 * only manages the Worker accounts of their vendor).
 */
export function UsersPageHeader() {
  const { user } = useSession();
  const site = useSiteContext();
  const manageAccess = can(user, 'USER_ACCESS_ADMIN');

  return (
    <PageHeader
      title={manageAccess ? 'Manajemen user' : 'Akun worker'}
      description={
        manageAccess
          ? 'Kelola akun, role, dan scope site/vendor.'
          : `Akun worker ${site.shortLabel}.`
      }
      actions={
        <Link
          href="/users/new"
          className={buttonVariants({ className: 'h-11 px-5 text-base font-semibold' })}
        >
          <Plus aria-hidden="true" className="size-5" />
          {manageAccess ? 'Tambah user' : 'Tambah worker'}
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
      title={can(user, 'USER_ACCESS_ADMIN') ? 'Tambah user' : 'Tambah worker'}
      description="Akun baru wajib mengganti password saat login pertama."
    />
  );
}
