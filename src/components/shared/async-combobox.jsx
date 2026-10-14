'use client';

import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown, Loader2, X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { fetchLookupOptions } from '@/lib/api/lookups';
import { cn } from '@/lib/utils';

/** @typedef {import('@/lib/api/lookups').Option} Option */

/**
 * @param {Option | Option[] | null | undefined} value
 * @returns {Option[]}
 */
function toOptionList(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/**
 * Server-searched combobox (`?q=&limit=20`), single or multiple selection.
 * Values are option objects so labels stay known while the search changes.
 * @param {object} props
 * @param {import('@/lib/api/lookups').LookupKind} props.lookup
 * @param {Record<string, string | undefined>} [props.params] Extra filters, e.g. `{ site_id }`.
 * @param {boolean} [props.multiple]
 * @param {Option | Option[] | null} props.value
 * @param {(value: any) => void} props.onChange Receives `Option | null` or `Option[]`.
 * @param {string} props.placeholder Shown when nothing is selected (e.g. "Semua vendor").
 * @param {string} [props.id]
 * @param {string} [props.ariaLabel]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.invalid]
 * @param {string} [props.describedBy]
 * @param {string} [props.className]
 */
export function AsyncCombobox({
  lookup,
  params,
  multiple = false,
  value,
  onChange,
  placeholder,
  id,
  ariaLabel,
  disabled = false,
  invalid = false,
  describedBy,
  className,
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 300);
  const selected = toOptionList(value);

  const query = useQuery({
    queryKey: ['lookups', lookup, 'search', q, params ?? {}],
    queryFn: () => fetchLookupOptions(lookup, { q, params }),
    enabled: open,
    staleTime: 30_000,
  });

  /** @param {Option} option */
  const toggle = (option) => {
    if (!multiple) {
      onChange(selected[0]?.value === option.value ? null : option);
      setOpen(false);
      return;
    }
    const exists = selected.some((item) => item.value === option.value);
    onChange(
      exists ? selected.filter((item) => item.value !== option.value) : [...selected, option],
    );
  };

  const summary = multiple ? selected.map((item) => item.label).join(', ') : selected[0]?.label;

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={ariaLabel}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            disabled={disabled}
            className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3.5 text-left text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive sm:text-[15px]"
          >
            <span className={cn('truncate', !summary && 'text-muted-foreground')}>
              {summary || placeholder}
            </span>
            <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Cari…"
              className="text-base"
            />
            <CommandList id={listId}>
              {query.isFetching ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Mencari…
                </div>
              ) : null}
              {query.isError ? (
                <p className="px-3 py-3 text-sm text-destructive">Gagal memuat pilihan.</p>
              ) : null}
              <CommandEmpty>Tidak ada hasil.</CommandEmpty>
              {(query.data ?? []).map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  data-checked={selected.some((item) => item.value === option.value)}
                  onSelect={() => toggle(option)}
                  className="min-h-10"
                >
                  <span className="truncate">{option.label}</span>
                  {option.hint ? (
                    <span className="ml-1 truncate text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {multiple && selected.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Pilihan">
          {selected.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                onClick={() => toggle(item)}
                disabled={disabled}
                className="inline-flex h-8 items-center gap-1 rounded-full border bg-muted px-3 text-sm text-foreground hover:bg-muted/70"
                aria-label={`Hapus ${item.label}`}
              >
                {item.label}
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
