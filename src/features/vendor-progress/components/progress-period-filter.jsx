'use client';

import { Input } from '@/components/ui/input';

/**
 * "Dari" / "Sampai" date inputs (today by default, at most 31 days, not in the future).
 * @param {object} props
 * @param {{ from: string, to: string, error: string | null }} props.range
 * @param {string} props.today
 * @param {(updates: { from?: string | null, to?: string | null }) => void} props.onChange
 */
export function ProgressPeriodFilter({ range, today, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Dari
          <Input
            type="date"
            value={range.from}
            max={today}
            onChange={(e) => onChange({ from: e.target.value || null })}
            className="h-11 sm:w-44"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Sampai
          <Input
            type="date"
            value={range.to}
            min={range.from}
            max={today}
            onChange={(e) => onChange({ to: e.target.value || null })}
            className="h-11 sm:w-44"
          />
        </label>
      </div>
      {range.error ? (
        <p role="alert" className="text-sm text-destructive">
          {range.error}
        </p>
      ) : null}
    </div>
  );
}
