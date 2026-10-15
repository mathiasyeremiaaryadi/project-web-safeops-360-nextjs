import { VendorProgressDetail } from '@/features/vendor-progress';

export const metadata = { title: 'Detail progress vendor' };

/**
 * `/vendor-progress/[vendorId]`
 * @param {{ params: Promise<{ vendorId: string }> }} props
 */
export default async function VendorProgressDetailPage({ params }) {
  const { vendorId } = await params;
  return <VendorProgressDetail vendorId={vendorId} />;
}
