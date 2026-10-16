'use client';

import { Input } from '@/components/ui/input';
import { LookupFilter } from '@/components/shared/lookup-filter';
import { cn } from '@/lib/utils';

/**
 * Site + vendor filters of the report lists, plus an optional date range (`from`/`to` as
 * `YYYY-MM-DD`) and extra controls (e.g. report type).
 * @param {object} props
 * @param {{ site_id: string, vendor_id: string, from?: string, to?: string }} props.params
 * @param {(updates: Record<string, string>) => void} props.onChange
 * @param {boolean} [props.dateRange]
 * @param {boolean} [props.showSite] Hidden for users whose data is limited to their own sites.
 * @param {boolean} [props.showVendor] Hidden for a vendor's own users.
 * @param {import('react').ReactNode} [props.children] Extra filter controls, shown first.
 * @param {string} [props.className] Grid columns override, e.g. `xl:grid-cols-5` for 5 controls.
 */
export function ReportFilters({
  params,
  onChange,
  dateRange = false,
  showSite = true,
  showVendor = true,
  children,
  className,
}) {
  return (
    <div className={cn('mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {children}
      {dateRange ? (
        <>
          <Input
            type="date"
            aria-label="Dari tanggal"
            value={params.from ?? ''}
            max={params.to || undefined}
            onChange={(e) => onChange({ from: e.target.value })}
          />
          <Input
            type="date"
            aria-label="Sampai tanggal"
            value={params.to ?? ''}
            min={params.from || undefined}
            onChange={(e) => onChange({ to: e.target.value })}
          />
        </>
      ) : null}
      {showSite ? (
        <LookupFilter
          lookup="sites"
          value={params.site_id}
          onChange={(site_id) => onChange({ site_id })}
          placeholder="Semua site"
          ariaLabel="Filter site"
        />
      ) : null}
      {showVendor ? (
        <LookupFilter
          lookup="vendors"
          params={params.site_id ? { site_id: params.site_id } : undefined}
          value={params.vendor_id}
          onChange={(vendor_id) => onChange({ vendor_id })}
          placeholder="Semua vendor"
          ariaLabel="Filter vendor"
        />
      ) : null}
    </div>
  );
}
