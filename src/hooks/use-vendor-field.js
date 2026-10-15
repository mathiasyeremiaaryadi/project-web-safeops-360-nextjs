'use client';

import { useSiteContext } from '@/hooks/use-site-context';
import { DATA_SCOPE } from '@/lib/auth/permissions';
import { useCurrentVendorId, withOwnVendor } from '@/features/auth';

/**
 * The vendor field of a form (inventory, SOP, worker account). Users who work across vendors
 * choose it; a vendor's own user (Admin vendor) never sees it — their vendor is filled in.
 */
export function useVendorField() {
  const site = useSiteContext();
  const vendorId = useCurrentVendorId();
  const ownVendor = site.mode === DATA_SCOPE.VENDOR && vendorId ? vendorId : null;

  return {
    /** Render the vendor field. */
    show: !ownVendor,
    /** Initial value of a new record: the user's own vendor (so validation passes), else empty. */
    defaultValue: ownVendor ? { value: ownVendor, label: site.shortLabel } : null,
    /**
     * Final payload: with the user's own vendor (`withOwnVendor`) for a vendor's user.
     * @template {Record<string, unknown>} T
     * @param {T} payload
     */
    complete: (payload) => (ownVendor ? withOwnVendor(payload, ownVendor) : payload),
  };
}
