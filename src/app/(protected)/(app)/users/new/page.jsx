import { PageHeader } from '@/components/layout/page-header';
import { CreateUserForm } from '@/features/users';

export const metadata = { title: 'Tambah user' };

/** `/users/new` */
export default function NewUserPage() {
  return (
    <>
      <PageHeader
        title="Tambah user"
        description="Akun baru wajib mengganti password saat login pertama."
      />
      <CreateUserForm />
    </>
  );
}
