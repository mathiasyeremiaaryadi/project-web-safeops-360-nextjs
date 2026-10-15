import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LEVEL_NAMES, MAX_LEVEL, MAX_PERCENT } from '@/features/sla-shared';

/**
 * Score bar 0–100 WITHOUT a target line (compliance is decided per indicator, not by a
 * threshold): green when compliant, orange when not.
 * @param {{ score: number, tone: 'success' | 'warning' | null, label: string, className?: string }} props
 */
export function ScoreBar({ score, tone, label, className }) {
  const value = Math.min(MAX_PERCENT, Math.max(0, score));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={MAX_PERCENT}
      aria-valuenow={value}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn('h-full rounded-full', tone === 'warning' ? 'bg-warning' : 'bg-success')}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

/**
 * Five pips, the first `level` filled, + "Level n · name".
 * @param {{ level: number | null | undefined }} props
 */
export function LevelPips({ level }) {
  const current = level ?? 0;
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="inline-flex gap-1">
        {Array.from({ length: MAX_LEVEL }, (_, index) => (
          <span
            key={index}
            className={cn('size-2.5 rounded-full', index < current ? 'bg-primary' : 'bg-muted')}
          />
        ))}
      </span>
      <span className="text-sm font-medium text-foreground">
        Level {current} · {LEVEL_NAMES[/** @type {keyof typeof LEVEL_NAMES} */ (current)] ?? '—'}
      </span>
    </span>
  );
}

/** "Sementara": numbers of the current period may still change. */
export function LiveBadge() {
  return <Badge variant="info">Sementara</Badge>;
}
