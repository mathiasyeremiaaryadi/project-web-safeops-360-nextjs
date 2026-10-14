import { UserDetail } from '@/features/users';

export const metadata = { title: 'Detail user' };

/**
 * `/users/[id]`
 * @param {{ params: Promise<{ id: string }> }} props
 */
export default async function UserDetailPage({ params }) {
  const { id } = await params;
  return <UserDetail id={id} />;
}
