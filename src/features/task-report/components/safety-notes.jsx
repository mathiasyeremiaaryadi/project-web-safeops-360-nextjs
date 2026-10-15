'use client';

import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { NOTE_CATEGORY_LABELS } from '@/lib/task-reports';

/** "Tidak ada" (`''` → sent as `null`) followed by the categories of the review pages. */
const CATEGORY_OPTIONS = [['', 'Tidak ada'], ...Object.entries(NOTE_CATEGORY_LABELS)];

/**
 * "Catatan & temuan safety": category radio cards + notes. Saved with "Simpan" (no autosave).
 * @param {object} props
 * @param {{ notes: string, category: string }} props.value
 * @param {(value: { notes: string, category: string }) => void} props.onChange
 * @param {boolean} props.disabled
 */
export function SafetyNotes({ value, onChange, disabled }) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <h2 id={`${id}-title`} className="font-semibold text-foreground">
        Catatan &amp; temuan safety
      </h2>
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-2 text-sm font-medium text-foreground">Kategori temuan</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_OPTIONS.map(([category, label]) => (
            <label
              key={category || 'none'}
              className={cn(
                'flex min-h-12 items-center gap-2 rounded-xl border bg-card px-3 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                disabled ? 'opacity-70' : 'cursor-pointer',
              )}
            >
              <input
                type="radio"
                name={`${id}-category`}
                value={category}
                checked={value.category === category}
                onChange={() => onChange({ ...value, category })}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-notes`}>Catatan</Label>
        <Textarea
          id={`${id}-notes`}
          rows={4}
          maxLength={1000}
          value={value.notes}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, notes: event.target.value })}
          placeholder="Tulis temuan atau kondisi di lapangan"
        />
        <p className="text-xs text-muted-foreground">
          Catatan bisa diubah selama laporan belum disetujui.
        </p>
      </div>
    </section>
  );
}
