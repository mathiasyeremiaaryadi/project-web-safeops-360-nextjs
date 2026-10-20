'use client';

import { useVendors } from '@/features/vendors';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { useSiteContext } from '@/hooks/use-site-context';
import { todayInAppTimezone } from '@/lib/date';
import { parseAsString, useQueryStates } from 'nuqs';

const PARSERS = {
  date: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  vendor_id: parseAsString.withDefault(''),
  q: parseAsString.withDefault(''),
};

/**
 * Filter halaman Vendor Progress.
 *
 * Filter disimpan di URL agar halaman daftar dan detail menggunakan
 * tanggal, site, dan vendor yang sama.
 *
 * API Vendor Progress menggunakan satu tanggal (date).
 */
export function useProgressFilters() {
  const today = todayInAppTimezone();

  const [params, setParams] = useQueryStates(PARSERS, {
    history: 'replace',
    clearOnDefault: true,
  });

  const site = useSiteContext();
  const date = params.date || today;

  return {
    params,
    setParams,
    today,
    date,
    site,
    siteId: site.siteIdFor(params.site_id),

    /**
     * Parameter URL untuk berpindah antara halaman daftar dan detail.
     * Filter yang kosong tidak disertakan.
     */
    search: new URLSearchParams(
      Object.entries({
        date,
        site_id: params.site_id,
        vendor_id: params.vendor_id,
      }).filter(([, value]) => value),
    ).toString(),
  };
}

/**
 * Mengambil nama site dari row Vendor Progress.
 *
 * Urutan fallback:
 * 1. site_name dari response API.
 * 2. Site yang dipilih pada filter.
 * 3. Daftar site milik vendor.
 *
 * @param {string | undefined} filterSiteId
 */
export function useSiteNames(filterSiteId) {
  const sites = useOptionLabels('sites');
  const vendors = useVendors({ page: 1, limit: 100 });

  /** @param {import('@/features/vendor-progress/lib/progress').VendorProgress} row */
  return (row) => {
    if (row.siteName) {
      return row.siteName;
    }

    const siteId = row.siteId ?? filterSiteId;

    if (siteId) {
      return sites.labelOf(siteId);
    }

    const vendor = vendors.data?.data.find((item) => item.id === row.vendorId);

    const names = (vendor?.site_ids ?? []).map(sites.labelOf).filter((name) => name !== '—');

    return names.join(', ') || '—';
  };
}
