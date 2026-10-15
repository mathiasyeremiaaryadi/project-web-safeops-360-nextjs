import { cn } from '@/lib/utils';

/**
 * "92%" with a bar, for a table cell or a card.
 * @param {{ percent: number, label: string, className?: string }} props
 */
export function ProgressBar({ percent, label, className }) {
  const value = Math.min(100, Math.max(0, percent));
  return (
    <div className={cn('flex min-w-28 items-center gap-2.5', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-success" style={{ width: `${value}%` }} />
      </div>
      <span className="w-11 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
        {value}%
      </span>
    </div>
  );
}
