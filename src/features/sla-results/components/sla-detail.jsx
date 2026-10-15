'use client';

import { parseAsString, useQueryStates } from 'nuqs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { NotFoundState } from '@/components/shared/not-found-state';
import { ResponsiveList } from '@/components/shared/responsive-list';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  formatIndicatorValue,
  formatScore,
  formatTarget,
  indicatorLabel,
  LEVEL_NAMES,
  MAX_LEVEL,
  MAX_PERCENT,
  PERIOD_LABELS,
  SCOPES,
  UNITS,
  useCatalog,
  useMaturityRuleLevels,
} from '@/features/sla-shared';
import { useHistoryResults, useLiveResults } from '@/features/sla-results/api/queries';
import { LiveBadge, ScoreBar } from '@/features/sla-results/components/result-bits';
import { useEntityNames } from '@/features/sla-results/hooks/use-entity-names';
import { isEntity } from '@/features/sla-results/lib/entity';
import {
  formatPeriod,
  getResultDisplay,
  metCount,
  nextLevelGap,
  periodStartBefore,
} from '@/features/sla-results/lib/results';

/** @typedef {import('@/features/sla-results/api/schemas').ResultItem} ResultItem */

const PARAMS = {
  scope: parseAsString.withDefault(SCOPES.VENDOR),
  vendor_id: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  worker_id: parseAsString.withDefault(''),
  period_start: parseAsString.withDefault(''),
};

/** Status badge of one indicator, as the backend decided it. @param {ResultItem} item */
const itemBadge = (item) => {
  if (item.is_na) return { label: 'N/A', variant: 'neutral' };
  return item.met
    ? { label: 'Tercapai', variant: 'success' }
    : { label: 'Tidak tercapai', variant: 'warning' };
};

/**
 * `/sla/detail` — one period of one entity. There is no detail endpoint: the row comes from the
 * live results (current period) or the history of that period.
 */
export function SlaDetail() {
  const [params] = useQueryStates(PARAMS);
  // Old links may carry a timestamp: the API takes a date.
  const periodStart = params.period_start.slice(0, 10);
  const entity = {
    scope: params.scope,
    vendor_id: params.vendor_id || undefined,
    site_id: params.site_id || undefined,
    worker_id: params.worker_id || undefined,
  };
  const live = useLiveResults(entity);
  const liveRow = (live.data ?? []).find(
    (row) => isEntity(row, entity) && row.period_start === periodStart,
  );
  const frozen = useHistoryResults(
    { ...entity, from: periodStart, to: periodStart },
    { enabled: live.isSuccess && !liveRow && Boolean(periodStart) },
  );
  const row =
    liveRow ??
    (frozen.data ?? []).find((r) => isEntity(r, entity) && r.period_start === periodStart);
  const previousStart = row?.period_start
    ? periodStartBefore(row.period_type, row.period_start)
    : undefined;
  const previous = useHistoryResults(
    { ...entity, from: previousStart, to: previousStart },
    { enabled: Boolean(previousStart) },
  );
  const previousRow = (previous.data ?? []).find((r) => isEntity(r, entity));
  const catalog = useCatalog('sla');
  const ruleLevels = useMaturityRuleLevels(row?.maturity?.rule_id);
  const namesOf = useEntityNames(params.scope);

  const loading = live.isPending || (!liveRow && frozen.isPending && frozen.fetchStatus !== 'idle');
  if (loading) return <ListSkeleton rows={4} />;
  if (live.isError || frozen.isError) {
    return <ErrorState onRetry={() => Promise.all([live.refetch(), frozen.refetch()])} />;
  }
  if (!row) {
    return (
      <NotFoundState
        description="Hasil untuk periode ini tidak ada atau di luar akses Anda."
        backHref="/sla"
        backLabel="Kembali ke SLA & maturity"
      />
    );
  }

  const names = namesOf(row);
  const sla = row.sla;
  const slaDisplay = getResultDisplay(sla);
  const maturityDisplay = getResultDisplay(row.maturity, 'maturity');
  const { met, counted } = sla ? metCount(sla) : { met: 0, counted: 0 };
  const naCount = sla ? sla.items.filter((item) => item.is_na).length : 0;
  const period = formatPeriod(row.period_type, row.period_start);
  const level = row.maturity?.level ?? null;
  const previousLevel = previousRow?.maturity?.level ?? null;
  const ruleText = sla?.rule_version
    ? `aturan v${sla.rule_version} (${PERIOD_LABELS[/** @type {keyof typeof PERIOD_LABELS} */ (row.period_type ?? '')] ?? row.period_type})`
    : null;

  /** @param {ResultItem} item */
  const metaOf = (item) => catalog.byCode[item.code];
  const columns = [
    {
      id: 'indicator',
      header: 'Indikator',
      meta: { sortValue: (/** @type {ResultItem} */ i) => indicatorLabel(i.code) },
      cell: ({ row: r }) => <span className="font-medium">{indicatorLabel(r.original.code)}</span>,
    },
    {
      id: 'weight',
      header: 'Bobot',
      meta: { sortValue: (/** @type {ResultItem} */ i) => i.weight ?? 0 },
      cell: ({ row: r }) => `${formatScore(r.original.weight)}%`,
    },
    {
      id: 'target',
      header: 'Target',
      cell: ({ row: r }) =>
        formatTarget(
          r.original.target,
          metaOf(r.original)?.unit ?? UNITS.SCORE,
          metaOf(r.original)?.direction ?? 'up',
        ),
    },
    {
      id: 'actual',
      header: 'Aktual',
      cell: ({ row: r }) =>
        r.original.is_na
          ? '—'
          : formatIndicatorValue(r.original.actual, metaOf(r.original)?.unit ?? UNITS.SCORE),
    },
    {
      id: 'score',
      header: 'Skor',
      meta: { sortValue: (/** @type {ResultItem} */ i) => i.score ?? -1 },
      cell: ({ row: r }) => (r.original.is_na ? '—' : formatScore(r.original.score)),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row: r }) => <StatusBadge status={/** @type {any} */ (itemBadge(r.original))} />,
    },
  ];

  const gap = level && level < MAX_LEVEL ? nextLevelGap(row.maturity, ruleLevels.data ?? []) : null;
  const nextLevel = gap ? ruleLevels.data?.find((l) => l.level === (level ?? 0) + 1) : null;

  return (
    <>
      <PageHeader
        title={`Rincian ${period}`}
        description={[names.title, names.subtitle, ruleText].filter(Boolean).join(' · ')}
        actions={row.live ? <LiveBadge /> : <Badge variant="neutral">Final</Badge>}
      />

      <dl className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Skor SLA</dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {slaDisplay.showScore ? formatScore(sla?.score) : '—'}
          </dd>
          <dd className="mt-1 flex flex-col gap-1">
            <StatusBadge status={slaDisplay.badge} />
            {slaDisplay.showScore ? null : (
              <span className="text-xs text-muted-foreground">{slaDisplay.message}</span>
            )}
          </dd>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Indikator tercapai</dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {slaDisplay.showScore ? `${met} dari ${counted}` : '—'}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {naCount} indikator N/A · {sla?.task_count ?? 0} task
          </dd>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Level maturity</dt>
          <dd className="text-2xl font-semibold">
            {maturityDisplay.showScore ? `Level ${level}` : '—'}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {maturityDisplay.showScore
              ? [
                  LEVEL_NAMES[/** @type {keyof typeof LEVEL_NAMES} */ (level ?? 0)],
                  previousLevel && previousLevel !== level
                    ? `sebelumnya Level ${previousLevel}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : maturityDisplay.badge.label}
          </dd>
        </div>
      </dl>

      {slaDisplay.showScore && sla ? (
        <section aria-labelledby="indicator-title" className="mb-6 flex flex-col gap-3">
          <h2 id="indicator-title" className="text-lg font-semibold text-foreground">
            Indikator SLA
          </h2>
          <ResponsiveList
            data={sla.items}
            columns={columns}
            getRowId={(item) => item.code}
            caption={`Indikator SLA ${period}`}
            cardGridClassName="sm:grid-cols-2"
            renderCard={(item) => (
              <div className="flex flex-col gap-1.5 rounded-2xl border bg-card p-4 text-sm">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{indicatorLabel(item.code)}</span>
                  <StatusBadge status={/** @type {any} */ (itemBadge(item))} />
                </span>
                <span className="text-muted-foreground">
                  Bobot {formatScore(item.weight)}% · Target{' '}
                  {formatTarget(
                    item.target,
                    metaOf(item)?.unit ?? UNITS.SCORE,
                    metaOf(item)?.direction ?? 'up',
                  )}
                </span>
                <span>
                  Aktual{' '}
                  {item.is_na
                    ? '—'
                    : formatIndicatorValue(item.actual, metaOf(item)?.unit ?? UNITS.SCORE)}{' '}
                  · Skor {item.is_na ? '—' : formatScore(item.score)}
                </span>
              </div>
            )}
          />
          <p className="font-semibold text-foreground">
            Total skor {formatScore(sla.score)} / {MAX_PERCENT}
          </p>
          <p className="text-sm text-muted-foreground">
            Indikator N/A tidak ikut dihitung; bobotnya dinormalisasi dari indikator lain. SLA
            tercapai bila semua indikator non-N/A memenuhi target.
          </p>
        </section>
      ) : null}

      {maturityDisplay.showScore && row.maturity ? (
        <section aria-labelledby="maturity-title" className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 id="maturity-title" className="mb-1 text-lg font-semibold text-foreground">
            Maturity · skor {formatScore(row.maturity.score)}
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {row.maturity.dimensions.map((dimension) => (
              <li key={dimension.code} className="flex flex-col gap-1.5 text-sm">
                <span className="flex justify-between gap-3">
                  <span className="font-medium">{indicatorLabel(dimension.code)}</span>
                  <span className="tabular-nums">
                    {dimension.is_na ? 'N/A' : formatScore(dimension.score)}
                  </span>
                </span>
                <div className="relative">
                  <ScoreBar
                    score={dimension.is_na ? 0 : (dimension.score ?? 0)}
                    tone={null}
                    label={`Nilai ${indicatorLabel(dimension.code)}`}
                  />
                  {nextLevel ? (
                    <span
                      aria-hidden="true"
                      title={`Minimum Level ${nextLevel.level}: ${formatScore(nextLevel.min_dimension)}`}
                      className="absolute -top-1 h-4 w-0.5 bg-foreground"
                      style={{ left: `${Math.min(MAX_PERCENT, nextLevel.min_dimension)}%` }}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {gap && nextLevel ? (
            <p className="mt-4 text-sm text-foreground">
              Menuju Level {nextLevel.level}: skor minimal {formatScore(nextLevel.min_score)}
              {gap.scoreShort > 0 ? ` (kurang ${formatScore(gap.scoreShort)})` : ''} dan setiap
              dimensi minimal {formatScore(nextLevel.min_dimension)}
              {gap.belowDimensions.length
                ? ` (${gap.belowDimensions.map(indicatorLabel).join(', ')})`
                : ''}{' '}
              selama {nextLevel.consecutive_periods} periode berturut-turut.
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
