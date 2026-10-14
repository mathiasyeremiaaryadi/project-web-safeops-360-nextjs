import { ROLES } from '@/lib/constants';
import { VENDOR_SCOPED_ROLES } from '@/features/users/constants';

/**
 * Short scope text: "Semua site & vendor", "Site: PLTU Paiton", "Vendor: PT Bersih Jaya".
 * @param {{ roles: string[], scopes: { site_ids: string[], vendor_ids: string[] } }} user
 * @param {{ siteName: (id: string) => string, vendorName: (id: string) => string }} names
 */
export function describeScope(user, { siteName, vendorName }) {
  if (user.roles.includes(ROLES.SUPER_ADMIN)) return 'Semua site & vendor';
  const parts = [];
  if (user.roles.includes(ROLES.ADMIN) && user.scopes.site_ids.length) {
    parts.push(`Site: ${user.scopes.site_ids.map(siteName).join(', ')}`);
  }
  if (
    user.roles.some((role) => VENDOR_SCOPED_ROLES.includes(role)) &&
    user.scopes.vendor_ids.length
  ) {
    parts.push(`Vendor: ${user.scopes.vendor_ids.map(vendorName).join(', ')}`);
  }
  return parts.join(' · ') || 'Belum ada scope';
}
