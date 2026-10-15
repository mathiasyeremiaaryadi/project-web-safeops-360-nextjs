'use client';

import Link from 'next/link';
import { parseAsString, useQueryStates } from 'nuqs';
import { Gauge, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { LookupFilter } from '@/components/shared/lookup-filter';
import { ResponsiveList } from '@/components/shared/responsive-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusTabs } from '@/components/shared/status-tabs';
import { useSiteContext } from '@/hooks/use-site-context';
import { can, DATA_SCOPE, getDataScope } from '@/lib/auth/permissions';
import { useSession } from '@/features/auth';
import {
  canCreateRules,
  formatScore,
  LEVEL_NAMES,
  MAX_LEVEL,
  ruleNewHref,
  RULE_TYPES,
  SCOPE_LABELS,
  SCOPES,
} from '@/features/sla-shared';
import { useHistoryResults, useLiveResults } from '@/features/sla-results/api/queries';
import { LevelPips, LiveBadge, ScoreBar } from '@/features/sla-results/components/result-bits';
import { useEntityNames } from '@/features/sla-results/hooks/use-entity-names';
import { detailHref, entityKey, historyHref } from '@/features/sla-results/lib/entity';
import {
  formatPeriod,
  getResultDisplay,
  periodStartBefore,
  previousPeriodRange,
  summarizeResults,
} from '@/features/sla-results/lib/results';

/** @typedef {import('@/features/sla-results/lib/results').MergedResult} MergedResult */

/** Default level per data scope: everything → vendors, a site → vendors at the site. */
const DEFAULT_SCOPE = Object.freeze({
  [DATA_SCOPE.ALL]: SCOPES.VENDOR,
  [DATA_SCOPE.SITE]: SCOPES.SITE,
  [DATA_SCOPE.VENDOR]: SCOPES.VENDOR,
});

/** Tabs in this order: vendors at a site, vendors, workers. */
const SCOPE_TABS = [SCOPES.SITE, SCOPES.VENDOR, SCOPES.WORKER].map((value) => ({
  value,
  label: SCOPE_LABELS[value],
}));

const PARAMS = {
  scope: parseAsString.withDefault(''),
  vendor_id: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
};

/** `/sla` — current period of every entity in scope (numbers are provisional). */
export function SlaDashboard() {
  const { user } = useSession();
  const site = useSiteContext();
  const [params, setParams] = useQueryStates(PARAMS, { history: 'replace' });
  const scope =
    /** @type {string} */ (Object.values(SCOPES).find((s) => s === params.scope)) ??
    DEFAULT_SCOPE[getDataScope(user)];
  const filters = can(user, 'ALL_SITES_READ');
  const siteId = site.scoped ? (site.activeSiteId ?? undefined) : params.site_id || undefined;
  const apiParams = {
    scope,
    vendor_id: filters ? params.vendor_id || undefined : undefined,
    site_id: scope === SCOPES.VENDOR ? undefined : siteId,
  };
  const live = useLiveResults(apiParams);
  const rows = live.data ?? [];
  // ONE history request for the previous period of every row.
  const range = previousPeriodRange(rows);
  const previous = useHistoryResults(
    { ...apiParams, from: range?.from, to: range?.to },
    { enabled: Boolean(range) },
  );
  const previousByKey = new Map(
    (previous.data ?? []).map((row) => [`${entityKey(row)}|${row.period_start}`, row]),
  );
  /**
   * The frozen result of the period before a live SLA or maturity result. SLA and maturity of a
   * row may run on different period types, so each is looked up on its own.
   * @param {MergedResult} row
   * @param {'sla' | 'maturity'} kind
   */
  const previousOf = (row, kind) => {
    const current = row[kind];
    if (!current?.period_start) return undefined;
    const start = periodStartBefore(current.period_type, current.period_start);
    return previousByKey.get(`${entityKey(row)}|${start}`)?.[kind] ?? undefined;
  };
  /** Period label under a value. @param {MergedResult['sla']} result */
  const periodNote = (result) =>
    result?.period_start ? (
      <span className="text-xs text-muted-foreground">
        {formatPeriod(result.period_type, result.period_start)}
      </span>
    ) : null;
  const namesOf = useEntityNames(scope);
  const summary = summarizeResults(rows);
  const mayCreate = canCreateRules(user);
  const first = rows[0];
  const entityWord = scope === SCOPES.WORKER ? 'worker' : 'vendor';

  /** @param {MergedResult} row */
  const scoreCell = (row) => {
    const display = getResultDisplay(row.sla);
    if (!display.showScore) {
      return (
        <span className="flex flex-col gap-1">
          <StatusBadge status={display.badge} />
          <span className="text-xs text-muted-foreground">{display.message}</span>
          {display.offerRule && mayCreate ? (
            <Link
              href={ruleNewHref(RULE_TYPES.SLA, {
                vendor_id: row.vendor_id ?? '',
                site_id: scope === SCOPES.VENDOR ? '' : (row.site_id ?? ''),
              })}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Buat aturan SLA →
            </Link>
          ) : null}
        </span>
      );
    }
    return (
      <span className="flex min-w-32 flex-col gap-1.5">
        <span className="text-xl font-semibold text-foreground tabular-nums">
          {formatScore(row.sla?.score)}
        </span>
        <ScoreBar
          score={/** @type {number} */ (row.sla?.score)}
          tone={display.tone}
          label={`Skor SLA ${namesOf(row).title}`}
        />
        {periodNote(row.sla)}
      </span>
    );
  };

  /** @param {MergedResult} row */
  const statusCell = (row) => {
    const display = getResultDisplay(row.sla);
    if (!display.showScore) return <span className="text-muted-foreground">—</span>;
    return (
      <span className="flex flex-col gap-1">
        <StatusBadge status={display.badge} />
        <span className="text-xs text-muted-foreground">{display.message}</span>
      </span>
    );
  };

  /** @param {MergedResult} row */
  const levelCell = (row) => {
    const display = getResultDisplay(row.maturity, 'maturity');
    if (!display.showScore) return <StatusBadge status={display.badge} />;
    const before = previousOf(row, 'maturity')?.level;
    const level = row.maturity?.level ?? 0;
    return (
      <span className="flex flex-col gap-1">
        <LevelPips level={level} />
        {periodNote(row.maturity)}
        {before && before > level ? (
          <span className="text-xs text-warning">Turun dari Level {before}</span>
        ) : null}
      </span>
    );
  };

  /** @param {MergedResult} row */
  const trendOf = (row) => {
    const before = previousOf(row, 'sla');
    if (!getResultDisplay(row.sla).showScore || !getResultDisplay(before).showScore) return null;
    return /** @type {number} */ (row.sla?.score) - /** @type {number} */ (before?.score);
  };
  /** @param {MergedResult} row */
  const trendCell = (row) => {
    const delta = trendOf(row);
    if (delta === null) return <span className="text-muted-foreground">—</span>;
    const Icon = delta < 0 ? TrendingDown : TrendingUp;
    return (
      <span className={delta < 0 ? 'text-warning' : 'text-success'}>
        <Icon aria-hidden="true" className="mr-1 inline size-4" />
        {delta > 0 ? '+' : ''}
        {formatScore(delta)}
      </span>
    );
  };

  const columns = [
    {
      id: 'entity',
      header: SCOPE_LABELS[/** @type {keyof typeof SCOPE_LABELS} */ (scope)],
      meta: { sortValue: (/** @type {MergedResult} */ r) => namesOf(r).title },
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-semibold text-foreground">{namesOf(row.original).title}</span>
          {namesOf(row.original).subtitle ? (
            <span className="text-sm text-muted-foreground">{namesOf(row.original).subtitle}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'score',
      header: 'Skor SLA',
      meta: { sortValue: (/** @type {MergedResult} */ r) => r.sla?.score ?? -1 },
      cell: ({ row }) => scoreCell(row.original),
    },
    {
      id: 'status',
      header: 'Status SLA',
      meta: { sortValue: (/** @type {MergedResult} */ r) => String(r.sla?.compliant) },
      cell: ({ row }) => statusCell(row.original),
    },
    {
      id: 'level',
      header: 'Level maturity',
      meta: { sortValue: (/** @type {MergedResult} */ r) => r.maturity?.level ?? 0 },
      cell: ({ row }) => levelCell(row.original),
    },
    {
      id: 'trend',
      header: 'Tren',
      meta: { hideBelow: 'xl', sortValue: (/** @type {MergedResult} */ r) => trendOf(r) ?? 0 },
      cell: ({ row }) => trendCell(row.original),
    },
    {
      id: 'links',
      header: 'Aksi',
      cell: ({ row }) => <ResultLinks scope={scope} row={row.original} />,
    },
  ];

  const kpis = [
    [
      'Rata-rata skor SLA',
      formatScore(summary.averageScore),
      `${summary.okCount} ${entityWord} dengan data`,
    ],
    ['SLA tercapai', `${summary.compliantCount} / ${summary.okCount}`, 'semua indikator terpenuhi'],
    [
      'Level maturity tertinggi',
      summary.highestLevel ? `Level ${summary.highestLevel}` : '—',
      summary.highestLevel
        ? LEVEL_NAMES[/** @type {keyof typeof LEVEL_NAMES} */ (summary.highestLevel)]
        : 'belum ada level',
    ],
    [
      'Belum bisa dinilai',
      String(summary.noRule + summary.noData),
      `${summary.noRule} tanpa aturan · ${summary.noData} tanpa data`,
    ],
  ];

  return (
    <>
      <PageHeader
        title="SLA & maturity"
        // Rows may run on different period types: each value shows its own period.
        description={[site.label, rows.length ? 'Periode berjalan' : null]
          .filter(Boolean)
          .join(' · ')}
        actions={first?.live ? <LiveBadge /> : null}
      />
      <p className="mb-4 flex items-start gap-2 rounded-xl bg-info-bg px-4 py-3 text-sm text-info">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Angka periode berjalan bersifat sementara dan masih bisa berubah sampai periode ditutup.
      </p>

      <StatusTabs
        label="Tingkat"
        options={SCOPE_TABS}
        value={scope}
        onChange={(value) => setParams({ scope: value })}
      />
      {filters ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <LookupFilter
            lookup="vendors"
            value={params.vendor_id}
            onChange={(vendor_id) => setParams({ vendor_id: vendor_id || null })}
            placeholder="Semua vendor"
            ariaLabel="Filter vendor"
          />
          {scope === SCOPES.VENDOR ? null : (
            <LookupFilter
              lookup="sites"
              value={params.site_id}
              onChange={(site_id) => setParams({ site_id: site_id || null })}
              placeholder="Semua site"
              ariaLabel="Filter site"
            />
          )}
        </div>
      ) : null}

      <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([label, value, hint]) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold text-foreground tabular-nums">{value}</dd>
            <dd className="text-xs text-muted-foreground">{hint}</dd>
          </div>
        ))}
      </dl>

      <div className="2xl:grid 2xl:grid-cols-[minmax(0,1fr)_320px] 2xl:items-start 2xl:gap-6">
        <div className="min-w-0">
          {live.isPending ? <ListSkeleton rows={4} /> : null}
          {live.isError ? <ErrorState onRetry={() => live.refetch()} /> : null}
          {live.isSuccess && rows.length === 0 ? (
            <EmptyState
              icon={Gauge}
              title="Belum ada hasil"
              description="Tidak ada data untuk tingkat dan filter ini."
            />
          ) : null}
          {rows.length > 0 ? (
            <ResponsiveList
              data={rows}
              columns={columns}
              getRowId={(row) => row.key}
              caption="SLA & maturity periode berjalan"
              cardGridClassName="sm:grid-cols-2"
              renderCard={(row) => (
                <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                  <span className="flex flex-col">
                    <span className="font-semibold text-foreground">{namesOf(row).title}</span>
                    {namesOf(row).subtitle ? (
                      <span className="text-sm text-muted-foreground">{namesOf(row).subtitle}</span>
                    ) : null}
                  </span>
                  {scoreCell(row)}
                  {statusCell(row)}
                  {levelCell(row)}
                  <ResultLinks scope={scope} row={row} />
                </div>
              )}
            />
          ) : null}
        </div>
        <aside
          aria-labelledby="level-spread-title"
          className="hidden rounded-2xl border bg-card p-5 2xl:block"
        >
          <h2 id="level-spread-title" className="mb-3 font-semibold text-foreground">
            Sebaran level maturity
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {Array.from({ length: MAX_LEVEL }, (_, index) => MAX_LEVEL - index).map((level) => (
              <li key={level} className="flex justify-between gap-3">
                <span>
                  Level {level} · {LEVEL_NAMES[/** @type {keyof typeof LEVEL_NAMES} */ (level)]}
                </span>
                <span className="font-semibold tabular-nums">
                  {summary.levelCounts[level] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}

/** "Rincian" and "Riwayat" of a row. @param {{ scope: string, row: MergedResult }} props */
function ResultLinks({ scope, row }) {
  return (
    <span className="flex flex-wrap gap-3 text-sm font-semibold">
      <Link href={detailHref(scope, row)} className="text-primary hover:underline">
        Rincian
      </Link>
      <Link href={historyHref(scope, row)} className="text-primary hover:underline">
        Riwayat
      </Link>
    </span>
  );
}
