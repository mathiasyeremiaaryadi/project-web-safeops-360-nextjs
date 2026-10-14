import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { UsersList } from '@/features/users';

export const metadata = { title: 'Manajemen user' };

/** `/users` */
export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="Manajemen user"
        description="Kelola akun, role, dan scope site/vendor."
        actions={
          <Link
            href="/users/new"
            className={buttonVariants({ className: 'h-11 px-5 text-base font-semibold' })}
          >
            <Plus aria-hidden="true" className="size-5" />
            Tambah user
          </Link>
        }
      />
      <UsersList />
    </>
  );
}
