import { MasterView } from '@/features/master';

export const metadata = { title: 'Site & vendor' };

/** `/master?tab=sites|vendors|items` */
export default function MasterPage() {
  return <MasterView />;
}
