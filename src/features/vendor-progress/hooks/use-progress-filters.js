'use client';

import { parseAsString, useQueryStates } from 'nuqs';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { useSiteContext } from '@/hooks/use-site-context';
import { todayInAppTimezone } from '@/lib/date';
import { useVendors } from '@/features/vendors';
import { resolveProgressRange } from '@/features/vendor-progress/lib/progress';

const PARSERS = {
  date: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  vendor_id: parseAsString.withDefault(''),
  q: parseAsString.withDefault(''),
};

/**
 * Date (today by default), site, vendor and search of the progress pages — the same filters as
 * "Rekap harian" — kept in the URL so the detail page opens with the same day. `range` is that
 * one day (`dates` has one entry).
 */
export function useProgressFilters() {
  const today = todayInAppTimezone();
  const [params, setParams] = useQueryStates(PARSERS, { history: 'replace', clearOnDefault: true });
  const site = useSiteContext();
  const range = resolveProgressRange(params.date, params.date, today);
  return {
    params,
    setParams,
    today,
    range,
    site,
    siteId: site.siteIdFor(params.site_id),
    /** `?date=&site_id=&vendor_id=` to carry over between the list and the detail page. */
    search: new URLSearchParams(
      Object.entries({
        date: params.date,
        site_id: params.site_id,
        vendor_id: params.vendor_id,
      }).filter(([, value]) => value),
    ).toString(),
  };
}

/**
 * Site name(s) of a progress row: from the row, else the chosen site, else the vendor's sites.
 * @param {string | undefined} filterSiteId
 */
export function useSiteNames(filterSiteId) {
  const sites = useOptionLabels('sites');
  const vendors = useVendors({ page: 1, limit: 100 });
  /** @param {import('@/features/vendor-progress/lib/progress').VendorProgress} row */
  return (row) => {
    if (row.siteName) return row.siteName;
    const siteId = row.siteId ?? filterSiteId;
    if (siteId) return sites.labelOf(siteId);
    const vendor = vendors.data?.data.find((v) => v.id === row.vendorId);
    const names = (vendor?.site_ids ?? []).map(sites.labelOf).filter((name) => name !== '—');
    return names.join(', ') || '—';
  };
}
