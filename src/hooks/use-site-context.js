'use client';

import { useMySites } from '@/hooks/use-my-sites';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { DATA_SCOPE, getDataScope } from '@/lib/auth/permissions';
import { useActiveSite, useCurrentVendorId, useSession } from '@/features/auth';

const ALL_MY_SITES = 'Semua site saya';

const VENDOR_OUT_OF_SCOPE = 'Vendor ini tidak termasuk site Anda.';

/** Save errors (per HTTP status) of a scoped user choosing a vendor outside their sites. */
const OUT_OF_SCOPE_ERRORS = Object.freeze({ 403: VENDOR_OUT_OF_SCOPE, 404: VENDOR_OUT_OF_SCOPE });

/**
 * Site / vendor context of the signed-in user, by data scope (`getDataScope`):
 *
 * - **ALL** (Super Admin): every site; pages keep their own site and vendor filters.
 * - **SITE** (Admin): their sites (`useMySites`); with more than one, a global site switcher
 *   whose choice is sent as `site_id` by every list. "Semua site saya" sends nothing.
 * - **VENDOR** (Admin vendor): one vendor, serving one or more sites. No site switcher: lists
 *   show a site filter only when the vendor serves several sites, and never a vendor filter.
 *   The label reads "{vendor} · {site}".
 */
export function useSiteContext() {
  const { user } = useSession();
  const { activeSiteId, setActiveSiteId } = useActiveSite();
  const mode = getDataScope(user);
  const options = useMySites(user, mode !== DATA_SCOPE.ALL);
  const vendorName = useVendorName(user, mode === DATA_SCOPE.VENDOR);
  const scoped = mode === DATA_SCOPE.SITE;
  // Ignore a stale choice (e.g. the site is no longer in the user's scope).
  const activeId =
    scoped && options.some((site) => site.value === activeSiteId) ? activeSiteId : null;

  /** @param {string} [pageSiteId] */
  const siteIdFor = (pageSiteId) => (scoped ? (activeId ?? undefined) : pageSiteId || undefined);
  const label = contextLabel({ mode, options, activeId, vendorName });

  return {
    mode,
    /** The user has a global site switcher (Admin). */
    scoped,
    sites: options,
    activeSiteId: activeId,
    setActiveSiteId,
    /** The site switcher has a choice to offer (more than one site). */
    canSwitch: scoped && options.length > 1,
    /** Shown in the sidebar and the breadcrumb. */
    label,
    /** Shown in the mobile top bar and the dashboard subtitle (the vendor name for a vendor). */
    shortLabel: vendorName ?? label,
    /** Pages show their own site filter: everyone for Super Admin, several sites for a vendor. */
    showSiteFilter: mode === DATA_SCOPE.ALL || (mode === DATA_SCOPE.VENDOR && options.length > 1),
    /** Pages show a vendor filter (not for a vendor's own users). */
    showVendorFilter: mode !== DATA_SCOPE.VENDOR,
    /**
     * `site_id` to send for a list: the active site for an Admin, otherwise the page's own
     * filter (undefined = not sent).
     * @param {string} [pageSiteId]
     */
    siteIdFor,
    /** Lookup filters to choose an active vendor of the active site (or of all the user's sites). */
    activeVendorParams: { status: 'ACTIVE', site_id: siteIdFor() },
    /** `getErrorMessage` overrides when saving a record for a vendor (403/404 = out of scope). */
    saveErrorOverrides: scoped ? OUT_OF_SCOPE_ERRORS : {},
  };
}

/**
 * Name of the user's own vendor: from `/auth/me` when it is sent, else from `GET /vendors`
 * (already limited to the user's vendor by the backend).
 * @param {{ vendors?: { id: string, name?: string | null }[], scopes?: { vendor_ids: string[] } } | null | undefined} user
 * @param {boolean} enabled
 */
function useVendorName(user, enabled) {
  const vendorId = useCurrentVendorId();
  const vendors = useOptionLabels('vendors');
  if (!enabled || !vendorId) return null;
  const fromMe = user?.vendors?.find((vendor) => vendor.id === vendorId)?.name;
  const fromList = vendors.labelOf(vendorId);
  return fromMe ?? (fromList === '—' ? 'Vendor saya' : fromList);
}

/**
 * @param {{ mode: string, options: { value: string, label: string }[], activeId: string | null, vendorName: string | null }} context
 */
function contextLabel({ mode, options, activeId, vendorName }) {
  if (mode === DATA_SCOPE.ALL) return 'Semua site';
  if (mode === DATA_SCOPE.VENDOR) {
    const sites = options.length > 1 ? `${options.length} site` : options[0]?.label;
    return sites ? `${vendorName} · ${sites}` : (vendorName ?? 'Sesuai scope akun');
  }
  const active = options.find((site) => site.value === activeId);
  if (active) return active.label;
  if (options.length === 1) return options[0].label;
  return options.length > 1 ? ALL_MY_SITES : 'Sesuai scope akun';
}

export { ALL_MY_SITES };
