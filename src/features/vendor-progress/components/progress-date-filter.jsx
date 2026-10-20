'use client';

import { Input } from '@/components/ui/input';

/**
 * Filter satu tanggal untuk halaman Vendor Progress.
 *
 * - Format tanggal: YYYY-MM-DD.
 * - Default tanggal: hari ini.
 * - Tidak mengizinkan tanggal di masa depan.
 * - Memilih hari ini akan menghapus parameter date dari URL.
 *
 * @param {object} props
 * @param {string} props.date
 * @param {string} props.today
 * @param {(updates: { date: string | null }) => void} props.onChange
 * @param {string} [props.className]
 */
export function ProgressDateFilter({ date, today, onChange, className }) {
  return (
    <Input
      type="date"
      aria-label="Tanggal"
      value={date || today}
      max={today}
      className={className}
      onChange={(event) => {
        const selectedDate = event.target.value;

        onChange({
          date: !selectedDate || selectedDate === today ? null : selectedDate,
        });
      }}
    />
  );
}
