'use client';

import { cn } from '@/lib/utils';

/**
 * Segmented status filter. Scrolls horizontally on small screens.
 * @param {object} props
 * @param {{ value: string, label: string }[]} props.options `value: ''` means "all".
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {string} props.label Accessible group name.
 */
export function StatusTabs({ options, value, onChange, label }) {
  return (
    <div className="-mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div
        role="group"
        aria-label={label}
        className="inline-flex gap-1 rounded-xl border bg-card p-1"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={`tab-${option.value}`}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'h-10 shrink-0 rounded-lg px-3.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
