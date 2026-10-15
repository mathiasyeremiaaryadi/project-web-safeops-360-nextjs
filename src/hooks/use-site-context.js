'use client';

import { useMySites } from '@/hooks/use-my-sites';
import { can } from '@/lib/auth/permissions';
import { useActiveSite, useSession } from '@/features/auth';

const ALL_MY_SITES = 'Semua site saya';

const VENDOR_OUT_OF_SCOPE = 'Vendor ini tidak termasuk site Anda.';

/** Save errors (per HTTP status) of a scoped user choosing a vendor outside their sites. */
const OUT_OF_SCOPE_ERRORS = Object.freeze({ 403: VENDOR_OUT_OF_SCOPE, 404: VENDOR_OUT_OF_SCOPE });

/**
 * Site context of the signed-in user.
 *
 * - A user who sees every site (Super Admin) is not "scoped": pages keep their own site filter.
 * - A scoped user (Admin) gets their sites from `useMySites` (backend-filtered `GET /sites`,
 *   with `/auth/me` as fallback) and may pick one in the site switcher. Lists then send `site_id` of that site; with "Semua
 *   site saya" nothing is sent and the backend returns all of the user's sites.
 */
export function useSiteContext() {
  const { user } = useSession();
  const { activeSiteId, setActiveSiteId } = useActiveSite();
  const scoped = !can(user, 'ALL_SITES_READ');
  const options = useMySites(user, scoped);
  // Ignore a stale choice (e.g. the site is no longer in the user's scope).
  const activeId = options.some((site) => site.value === activeSiteId) ? activeSiteId : null;

  /** @param {string} [pageSiteId] */
  const siteIdFor = (pageSiteId) => (scoped ? (activeId ?? undefined) : pageSiteId || undefined);

  return {
    scoped,
    sites: options,
    activeSiteId: activeId,
    setActiveSiteId,
    /** The user can switch between sites (more than one). */
    canSwitch: options.length > 1,
    /** Name shown in the sidebar, top bar, breadcrumb and dashboard subtitle. */
    label: contextLabel({ scoped, options, activeId }),
    /**
     * `site_id` to send for a list: the page's own filter for an unscoped user, the active
     * site for a scoped one (undefined = not sent).
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
 * @param {{ scoped: boolean, options: { value: string, label: string }[], activeId: string | null }} context
 */
function contextLabel({ scoped, options, activeId }) {
  if (!scoped) return 'Semua site';
  const active = options.find((site) => site.value === activeId);
  if (active) return active.label;
  if (options.length === 1) return options[0].label;
  return options.length > 1 ? ALL_MY_SITES : 'Sesuai scope akun';
}

export { ALL_MY_SITES };
