'use client';

import { Input } from '@/components/ui/input';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { useOptionLabels } from '@/hooks/use-option-labels';

/**
 * Site + vendor filters of the report lists, plus an optional date range (`from`/`to` as
 * `YYYY-MM-DD`) and extra controls (e.g. report type).
 * @param {object} props
 * @param {{ site_id: string, vendor_id: string, from?: string, to?: string }} props.params
 * @param {(updates: Record<string, string>) => void} props.onChange
 * @param {boolean} [props.dateRange]
 * @param {import('react').ReactNode} [props.children] Extra filter controls, shown first.
 */
export function ReportFilters({ params, onChange, dateRange = false, children }) {
  const sites = useOptionLabels('sites');
  const vendors = useOptionLabels('vendors');

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      <AsyncCombobox
        lookup="sites"
        value={
          params.site_id ? { value: params.site_id, label: sites.labelOf(params.site_id) } : null
        }
        onChange={(option) => onChange({ site_id: option?.value ?? '' })}
        placeholder="Semua site"
        ariaLabel="Filter site"
      />
      <AsyncCombobox
        lookup="vendors"
        params={params.site_id ? { site_id: params.site_id } : undefined}
        value={
          params.vendor_id
            ? { value: params.vendor_id, label: vendors.labelOf(params.vendor_id) }
            : null
        }
        onChange={(option) => onChange({ vendor_id: option?.value ?? '' })}
        placeholder="Semua vendor"
        ariaLabel="Filter vendor"
      />
    </div>
  );
}
