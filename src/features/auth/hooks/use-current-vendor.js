'use client';

import { useSession } from '@/features/auth/hooks/use-session';

/**
 * The vendor of a vendor-scoped user (Admin vendor, Worker): exactly one per FR-18, from the
 * `/auth/me` profile (`scopes.vendor_ids`). `null` for users without a vendor scope.
 * @returns {string | null}
 */
export function useCurrentVendorId() {
  const { user } = useSession();
  return user?.scopes.vendor_ids[0] ?? null;
}

/**
 * Puts the user's own vendor into a payload — the only place where a form without a vendor field
 * (inventory, SOP, worker account) gets its vendor. `vendor_ids` payloads (user accounts) get a
 * one-item list, others get `vendor_id`.
 * @template {Record<string, unknown>} T
 * @param {T} payload
 * @param {string} vendorId
 */
export function withOwnVendor(payload, vendorId) {
  return 'vendor_ids' in payload
    ? { ...payload, vendor_ids: [vendorId] }
    : { ...payload, vendor_id: vendorId };
}
