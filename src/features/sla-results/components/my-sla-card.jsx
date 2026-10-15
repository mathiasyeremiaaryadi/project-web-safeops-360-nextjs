'use client';

import { can } from '@/lib/auth/permissions';
import { useSession } from '@/features/auth';
import {
  formatIndicatorValue,
  formatScore,
  formatTarget,
  indicatorLabel,
  UNITS,
  useSlaCatalog,
} from '@/features/sla-shared';
import { useMySlaScores } from '@/features/sla-results/api/queries';
import { LiveBadge, ScoreBar } from '@/features/sla-results/components/result-bits';
import { formatPeriod, getResultDisplay } from '@/features/sla-results/lib/results';

/** Shown instead of a score when there is none. */
const EMPTY_TEXT = Object.freeze({
  NO_DATA: 'Tidak ada data di periode ini',
  NO_RULE: 'Belum ada aturan penilaian',
});

/**
 * "Skor SLA saya" on `/tasks`: the Worker's live score per site. Light on purpose (no chart, no
 * table, no maturity). Any error (403, 404, network) hides the card — it never blocks the work.
 */
export function MySlaCard() {
  const { user } = useSession();
  const allowed = can(user, 'SLA_RESULTS_READ_OWN');
  const scores = useMySlaScores({ enabled: allowed });
  const catalog = useSlaCatalog();
  if (!allowed || !scores.isSuccess || scores.data.length === 0) return null;
  const unitOf = (/** @type {string} */ code) =>
    catalog.data?.find((item) => item.code === code) ?? { unit: UNITS.SCORE, direction: 'up' };

  return (
    <>
      {scores.data.map((result) => {
        const display = getResultDisplay(result);
        const missed = result.items.find((item) => !item.is_na && item.met === false);
        return (
          <section
            key={`${result.site_id ?? ''}-${result.period_start ?? ''}`}
            aria-label="Skor SLA saya"
            className="rounded-2xl border bg-card p-4 sm:p-5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-foreground">Skor SLA saya</h2>
              {result.live ? <LiveBadge /> : null}
            </div>
            {display.showScore ? (
              <div className="flex flex-col gap-2">
                <p className="text-3xl font-semibold text-foreground tabular-nums">
                  {formatScore(result.score)}
                </p>
                <ScoreBar
                  score={/** @type {number} */ (result.score)}
                  tone={display.tone}
                  label="Skor SLA saya"
                />
                <p className="text-sm text-foreground">{display.message}</p>
                {missed ? (
                  <p className="text-sm text-warning">
                    {indicatorLabel(missed.code)}{' '}
                    {formatIndicatorValue(missed.actual, unitOf(missed.code).unit)} (target{' '}
                    {formatTarget(
                      missed.target,
                      unitOf(missed.code).unit,
                      unitOf(missed.code).direction,
                    )}
                    )
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {EMPTY_TEXT[/** @type {keyof typeof EMPTY_TEXT} */ (display.state)] ?? '—'}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {[result.site_name, formatPeriod(result.period_type, result.period_start)]
                .filter(Boolean)
                .join(' · ')}{' '}
              · bisa berubah sampai periode ditutup
            </p>
          </section>
        );
      })}
    </>
  );
}
