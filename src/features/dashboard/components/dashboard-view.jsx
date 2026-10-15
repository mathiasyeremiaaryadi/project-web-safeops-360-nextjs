'use client';

import { parseAsString } from 'nuqs';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { ReportFilters } from '@/components/shared/report-filters';
import { useListParams } from '@/hooks/use-list-params';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { useSiteContext } from '@/hooks/use-site-context';
import { formatLongDate, todayInAppTimezone } from '@/lib/date';
import { LatestInventoryReports } from '@/features/inventory-reports';
import { useDashboardKpis, useVendorProgress } from '@/features/dashboard/api/queries';
import { KpiCards } from '@/features/dashboard/components/kpi-cards';
import { VendorProgress } from '@/features/dashboard/components/vendor-progress';

const FILTERS = {
  date: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  vendor_id: parseAsString.withDefault(''),
};

/**
 * `/dashboard` — "Rekap harian". The date defaults to today in APP_TIMEZONE and is always sent
 * explicitly (the backend would otherwise use the UTC date). A user limited to their own sites
 * (Admin) has no site filter: the site comes from the site switcher and is named in the subtitle.
 */
export function DashboardView() {
  const { params, setFilters } = useListParams(FILTERS);
  const site = useSiteContext();
  const sites = useOptionLabels('sites');
  const today = todayInAppTimezone();
  const siteId = site.siteIdFor(params.site_id);
  const filters = { date: params.date || today, site_id: siteId, vendor_id: params.vendor_id };
  const kpis = useDashboardKpis(filters);
  const progress = useVendorProgress(filters);
  const scope = !site.scoped && params.site_id ? sites.labelOf(params.site_id) : site.label;

  return (
    <>
      <PageHeader title="Rekap harian" description={`${scope} · ${formatLongDate(filters.date)}`} />
      <ReportFilters
        // The vendor filter only offers vendors of the chosen site.
        params={{ ...params, site_id: siteId ?? '' }}
        showSite={!site.scoped}
        // A new site may not be served by the selected vendor: clear it.
        onChange={(updates) =>
          setFilters('site_id' in updates ? { ...updates, vendor_id: '' } : updates)
        }
      >
        <Input
          type="date"
          aria-label="Tanggal"
          value={filters.date}
          max={today}
          onChange={(e) => setFilters({ date: e.target.value === today ? '' : e.target.value })}
        />
      </ReportFilters>

      <div className="flex flex-col gap-5">
        <KpiCards query={kpis} />
        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          <div className="lg:col-span-2">
            <VendorProgress query={progress} />
          </div>
          <LatestInventoryReports siteId={siteId ?? ''} vendorId={params.vendor_id} />
        </div>
      </div>
    </>
  );
}
