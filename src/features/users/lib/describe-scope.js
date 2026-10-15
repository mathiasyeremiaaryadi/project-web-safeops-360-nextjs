import { ROLES } from '@/lib/constants';
import { VENDOR_SCOPED_ROLES } from '@/features/users/constants';

/**
 * Short scope text: "Semua site & vendor", "Site: PLTU Paiton", "Vendor: PT Bersih Jaya".
 * Names sent with the scope win over the lookups.
 * @param {{ roles: string[], scopes: { site_ids: string[], vendor_ids: string[], names?: Record<string, string> } }} user
 * @param {{ siteName: (id: string) => string, vendorName: (id: string) => string }} lookups
 */
export function describeScope(user, lookups) {
  const own = user.scopes.names ?? {};
  /** @param {string} id */
  const siteName = (id) => own[id] ?? lookups.siteName(id);
  /** @param {string} id */
  const vendorName = (id) => own[id] ?? lookups.vendorName(id);
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
