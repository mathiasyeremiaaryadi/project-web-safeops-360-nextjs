'use client';

import { AsyncCombobox } from '@/components/shared/async-combobox';
import { useOptionLabels } from '@/hooks/use-option-labels';

/**
 * Filter by one site / vendor / user, stored as an id (in the URL). Shows the name of the
 * selected id and searches options on the server.
 * @param {object} props
 * @param {import('@/lib/api/lookups').LookupKind} props.lookup
 * @param {string} props.value Selected id, `''` = all.
 * @param {(id: string) => void} props.onChange
 * @param {string} props.placeholder e.g. "Semua vendor"
 * @param {string} props.ariaLabel e.g. "Filter vendor"
 * @param {Record<string, string | undefined>} [props.params] Extra lookup filters.
 * @param {string} [props.className]
 */
export function LookupFilter({
  lookup,
  value,
  onChange,
  placeholder,
  ariaLabel,
  params,
  className,
}) {
  const labels = useOptionLabels(lookup);
  return (
    <AsyncCombobox
      className={className}
      lookup={lookup}
      params={params}
      value={value ? { value, label: labels.labelOf(value) } : null}
      onChange={(option) => onChange(option?.value ?? '')}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
    />
  );
}
