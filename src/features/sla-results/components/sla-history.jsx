'use client';

import Link from 'next/link';
import { parseAsString, useQueryStates } from 'nuqs';
import { History } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusTabs } from '@/components/shared/status-tabs';
import { cn } from '@/lib/utils';
import { formatScore, SCOPES } from '@/features/sla-shared';
import { useHistoryResults, useLiveResults } from '@/features/sla-results/api/queries';
import { useEntityNames } from '@/features/sla-results/hooks/use-entity-names';
import { detailHref, isEntity } from '@/features/sla-results/lib/entity';
import {
  formatPeriod,
  getResultDisplay,
  levelChangeText,
  periodStartBefore,
  scoreChartBars,
} from '@/features/sla-results/lib/results';

/** @typedef {import('@/features/sla-results/lib/results').MergedResult} MergedResult */

const RANGES = [
  { value: '6', label: '6 periode' },
  { value: '12', label: '12 periode' },
];

const PARAMS = {
  scope: parseAsString.withDefault(SCOPES.VENDOR),
  vendor_id: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  worker_id: parseAsString.withDefault(''),
  range: parseAsString.withDefault('6'),
};

/** Bar colours: compliant, not compliant, provisional (live). */
const BAR_TONE = Object.freeze({
  success: 'bg-primary',
  warning: 'bg-warning',
  live: 'border-2 border-dashed border-primary/60 bg-primary/20',
});

/** `/sla/history` — scores and levels of one entity over the last 6 / 12 periods. */
export function SlaHistory() {
  const [params, setParams] = useQueryStates(PARAMS, { history: 'replace' });
  const range = params.range === '12' ? 12 : 6;
  const entity = {
    scope: params.scope,
    vendor_id: params.vendor_id || undefined,
    site_id: params.site_id || undefined,
    worker_id: params.worker_id || undefined,
  };
  const live = useLiveResults(entity);
  const current = (live.data ?? []).find((row) => isEntity(row, entity));
  const start = current?.period_start;
  const history = useHistoryResults(
    {
      ...entity,
      from: start ? periodStartBefore(current?.period_type, start, range - 1) : undefined,
      to: start ? periodStartBefore(current?.period_type, start, 1) : undefined,
    },
    { enabled: live.isSuccess },
  );
  const namesOf = useEntityNames(params.scope);

  const periods = [
    ...(history.data ?? []).filter((row) => isEntity(row, entity)),
    ...(current ? [current] : []),
  ]
    .sort((a, b) => String(a.period_start).localeCompare(String(b.period_start)))
    .slice(-range);
  const bars = scoreChartBars(periods);
  const names = current ? namesOf(current) : null;
  const isPending = live.isPending || history.isPending;

  return (
    <>
      <PageHeader
        title="Riwayat & tren"
        description={names ? [names.title, names.subtitle].filter(Boolean).join(' · ') : undefined}
      />
      <StatusTabs
        label="Rentang"
        options={RANGES}
        value={String(range)}
        onChange={(value) => setParams({ range: value })}
      />
      {isPending ? <ListSkeleton rows={4} /> : null}
      {live.isError || history.isError ? (
        <ErrorState onRetry={() => Promise.all([live.refetch(), history.refetch()])} />
      ) : null}
      {!isPending && periods.length === 0 ? (
        <EmptyState icon={History} title="Belum ada riwayat" />
      ) : null}

      {periods.length > 0 ? (
        <div className="flex flex-col gap-5">
          <section
            aria-labelledby="score-chart-title"
            className="rounded-2xl border bg-card p-4 sm:p-5"
          >
            <h2 id="score-chart-title" className="mb-4 font-semibold text-foreground">
              Skor SLA per periode
            </h2>
            <div
              role="img"
              aria-label={`Skor SLA ${periods.length} periode terakhir, dari ${formatPeriod(periods[0].period_type, periods[0].period_start)} sampai ${formatPeriod(periods.at(-1)?.period_type, periods.at(-1)?.period_start)}. Rincian ada di daftar di bawah.`}
              className="flex h-48 items-end gap-2 border-b"
            >
              {bars.map((bar) => (
                <div
                  key={bar.key}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    {bar.label}
                  </span>
                  <span
                    className={cn(
                      'w-full max-w-12 rounded-t-md',
                      bar.tone ? BAR_TONE[bar.tone] : '',
                    )}
                    style={{ height: `${bar.heightPercent}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2">
              {periods.map((row) => (
                <span
                  key={row.key}
                  className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground"
                >
                  {formatPeriod(row.period_type, row.period_start)}
                </span>
              ))}
            </div>
            <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-3 rounded-sm bg-primary" /> Tercapai
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-3 rounded-sm bg-warning" /> Tidak tercapai
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn('size-3 rounded-sm', BAR_TONE.live)} />{' '}
                Sementara
              </span>
            </p>
          </section>

          <section aria-labelledby="level-title" className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 id="level-title" className="mb-3 font-semibold text-foreground">
              Level maturity per periode
            </h2>
            <ol className="flex flex-wrap gap-2">
              {periods.map((row) => (
                <li
                  key={row.key}
                  className="rounded-lg border px-2.5 py-1 text-xs"
                  title={formatPeriod(row.period_type, row.period_start)}
                >
                  <span className="sr-only">
                    {formatPeriod(row.period_type, row.period_start)}:{' '}
                  </span>
                  {getResultDisplay(row.maturity, 'maturity').showScore
                    ? `L${row.maturity?.level}`
                    : '—'}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-foreground">{levelChangeText(periods)}</p>
          </section>

          <section aria-labelledby="period-list-title">
            <h2 id="period-list-title" className="mb-3 font-semibold text-foreground">
              Ringkasan per periode
            </h2>
            <ul className="flex flex-col gap-2">
              {[...periods].reverse().map((row) => {
                const display = getResultDisplay(row.sla);
                const badge =
                  row.live && display.showScore
                    ? { label: 'Sementara', variant: 'info' }
                    : display.badge;
                return (
                  <li
                    key={row.key}
                    className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3.5 text-sm"
                  >
                    <span className="min-w-36 font-medium text-foreground">
                      {formatPeriod(row.period_type, row.period_start)}
                    </span>
                    <span className="w-14 font-semibold tabular-nums">
                      {display.showScore ? formatScore(row.sla?.score) : '—'}
                    </span>
                    <StatusBadge status={/** @type {any} */ (badge)} />
                    <span className="text-muted-foreground">
                      {getResultDisplay(row.maturity, 'maturity').showScore
                        ? `Level ${row.maturity?.level}`
                        : '—'}
                    </span>
                    <Link
                      href={detailHref(params.scope, row)}
                      className="ml-auto font-semibold text-primary hover:underline"
                    >
                      Rincian
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      ) : null}
    </>
  );
}
