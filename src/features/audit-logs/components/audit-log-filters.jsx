'use client';

import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { LookupFilter } from '@/components/shared/lookup-filter';
import { ACTION_FILTERS, ENTITY_FILTERS } from '@/features/audit-logs/constants';

/**
 * User (search), action, entity and date-range filters of the audit log.
 * @param {object} props
 * @param {{ user: string, action: string, entity: string, from: string, to: string }} props.params
 * @param {(updates: Record<string, string>) => void} props.onChange
 */
export function AuditLogFilters({ params, onChange }) {
  return (
    <div className="mb-4 grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(220px,1.4fr)_1fr_1fr_auto_auto]">
      <LookupFilter
        className="col-span-2 lg:col-span-1"
        lookup="users"
        value={params.user}
        onChange={(user) => onChange({ user })}
        placeholder="Semua user"
        ariaLabel="Filter user"
      />
      <NativeSelect
        aria-label="Filter aksi"
        className="w-full"
        value={params.action}
        onChange={(e) => onChange({ action: e.target.value })}
      >
        {ACTION_FILTERS.map((o) => (
          <NativeSelectOption key={o.value} value={o.value}>
            {o.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Filter entitas"
        className="w-full"
        value={params.entity}
        onChange={(e) => onChange({ entity: e.target.value })}
      >
        {ENTITY_FILTERS.map((o) => (
          <NativeSelectOption key={o.value} value={o.value}>
            {o.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
        Dari
        <Input
          type="date"
          value={params.from}
          max={params.to || undefined}
          onChange={(e) => onChange({ from: e.target.value })}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
        Sampai
        <Input
          type="date"
          value={params.to}
          min={params.from || undefined}
          onChange={(e) => onChange({ to: e.target.value })}
        />
      </label>
    </div>
  );
}
