'use client';

import { Input } from '@/components/ui/input';

/**
 * One date (today by default, not in the future), like the "Rekap harian" filter. Choosing today
 * clears the URL param.
 * @param {object} props
 * @param {string} props.date `YYYY-MM-DD`
 * @param {string} props.today
 * @param {(updates: { date: string | null }) => void} props.onChange
 * @param {string} [props.className]
 */
export function ProgressDateFilter({ date, today, onChange, className }) {
  return (
    <Input
      type="date"
      aria-label="Tanggal"
      value={date}
      max={today}
      className={className}
      onChange={(e) =>
        onChange({ date: !e.target.value || e.target.value === today ? null : e.target.value })
      }
    />
  );
}
