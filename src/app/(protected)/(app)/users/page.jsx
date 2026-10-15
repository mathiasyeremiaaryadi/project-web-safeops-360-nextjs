import { UsersList, UsersPageHeader } from '@/features/users';

export const metadata = { title: 'Manajemen user' };

/** `/users` — "Manajemen user" (Super Admin) or "Akun worker" (Admin vendor). */
export default function UsersPage() {
  return (
    <>
      <UsersPageHeader />
      <UsersList />
    </>
  );
}
