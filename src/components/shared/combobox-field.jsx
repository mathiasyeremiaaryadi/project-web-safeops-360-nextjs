'use client';

import { Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { AsyncCombobox } from '@/components/shared/async-combobox';

/**
 * Form field (React Hook Form) choosing one or more sites / vendors / users / tasks, with its
 * label and validation message. The value is an option `{ value, label }` (or a list of them).
 * @param {object} props
 * @param {import('react-hook-form').Control<any>} props.control
 * @param {string} props.name Form field name.
 * @param {string} props.id Input id (label `for`).
 * @param {string} props.label
 * @param {import('@/lib/api/lookups').LookupKind} props.lookup
 * @param {string} props.placeholder
 * @param {boolean} [props.multiple]
 * @param {boolean} [props.disabled]
 * @param {Record<string, string | undefined>} [props.params] Extra lookup filters.
 */
export function ComboboxField({
  control,
  name,
  id,
  label,
  lookup,
  placeholder,
  multiple = false,
  disabled = false,
  params,
}) {
  const errorId = `${id}-error`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-2">
          <Label htmlFor={id}>{label}</Label>
          <AsyncCombobox
            id={id}
            lookup={lookup}
            params={params}
            multiple={multiple}
            value={field.value}
            onChange={field.onChange}
            placeholder={placeholder}
            disabled={disabled}
            invalid={Boolean(fieldState.error)}
            describedBy={fieldState.error ? errorId : undefined}
          />
          {fieldState.error ? (
            <p id={errorId} className="text-sm text-destructive">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}
