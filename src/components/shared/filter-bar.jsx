'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Search box (300 ms debounce, value kept in the URL by the caller) + slot for filters.
 * @param {object} props
 * @param {string} props.search Current `q` from the URL.
 * @param {(q: string) => void} props.onSearchChange
 * @param {string} props.searchPlaceholder
 * @param {import('react').ReactNode} [props.children] Filter controls.
 * @param {string} [props.className]
 */
export function FilterBar({ search, onSearchChange, searchPlaceholder, children, className }) {
  const [text, setText] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  const timer = useRef(/** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined));

  // The URL changed from outside (back button, reset): show it.
  if (search !== lastSearch) {
    setLastSearch(search);
    setText(search);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  /** @param {string} value */
  const handleChange = (value) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearchChange(value.trim()), SEARCH_DEBOUNCE_MS);
  };

  return (
    <div
      className={cn('mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center', className)}
    >
      <div className="relative min-w-0 flex-1 sm:min-w-[260px]">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={text}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="pl-11"
        />
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
