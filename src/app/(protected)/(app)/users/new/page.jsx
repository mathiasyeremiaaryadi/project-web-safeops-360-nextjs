import { CreateUserForm, NewUserPageHeader } from '@/features/users';

export const metadata = { title: 'Tambah user' };

/** `/users/new` */
export default function NewUserPage() {
  return (
    <>
      <NewUserPageHeader />
      <CreateUserForm />
    </>
  );
}
