import { VendorProgressList } from '@/features/vendor-progress';

export const metadata = { title: 'Progress vendor' };

/** `/vendor-progress` — task progress per vendor. */
export default function VendorProgressPage() {
  return <VendorProgressList />;
}
