'use client';

import { useId, useState } from 'react';
import { FileUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const MIB = 1024 * 1024;

/** Upload rules from the BRD. */
export const FILE_RULES = Object.freeze({
  IMAGE: {
    types: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * MIB,
    hint: 'JPEG, PNG, atau WebP, maks. 5 MB',
  },
  PDF: { types: ['application/pdf'], maxBytes: 10 * MIB, hint: 'PDF, maks. 10 MB' },
});

/** @param {number} bytes */
export function formatFileSize(bytes) {
  if (bytes >= MIB) return `${(bytes / MIB).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Validates a file against a rule. Returns an error message or `null`.
 * @param {File} file
 * @param {{ types: readonly string[], maxBytes: number }} rule
 */
export function validateFile(file, rule) {
  if (!rule.types.includes(file.type)) return 'Format file tidak didukung.';
  if (file.size > rule.maxBytes) return 'Ukuran file melebihi batas.';
  return null;
}

/**
 * File input validated on the client before upload, with name/size preview.
 * @param {object} props
 * @param {string} props.label
 * @param {{ types: readonly string[], maxBytes: number, hint: string }} props.rule
 * @param {File | null} props.value
 * @param {(file: File | null) => void} props.onChange
 * @param {string} [props.error] Error from the form (e.g. "wajib diisi").
 * @param {string} [props.currentFileLabel] Shown when editing and no new file is chosen.
 */
export function FileField({ label, rule, value, onChange, error, currentFileLabel }) {
  const id = useId();
  const [localError, setLocalError] = useState(/** @type {string | null} */ (null));
  const message = localError ?? error;

  /** @param {import('react').ChangeEvent<HTMLInputElement>} event */
  const handleChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    const invalid = file ? validateFile(file, rule) : null;
    setLocalError(invalid);
    onChange(invalid ? null : file);
    if (invalid) event.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-[15px] font-medium sm:text-sm">
        {label}
      </Label>
      <label
        htmlFor={id}
        className={cn(
          'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-card px-3.5 py-2.5 text-sm focus-within:ring-2 focus-within:ring-ring/40 hover:bg-muted/60',
          message && 'border-destructive',
        )}
      >
        <FileUp aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          {value ? (
            <span className="block truncate text-foreground">
              {value.name} · {formatFileSize(value.size)}
            </span>
          ) : (
            <span className="block truncate text-muted-foreground">
              {currentFileLabel ?? 'Pilih file'}
            </span>
          )}
          <span className="block text-xs text-muted-foreground">{rule.hint}</span>
        </span>
        <input
          id={id}
          type="file"
          accept={rule.types.join(',')}
          onChange={handleChange}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-error` : undefined}
          className="sr-only"
        />
      </label>
      {message ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
