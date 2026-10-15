'use client';

import { useState } from 'react';
import Link from 'next/link';
import { parseAsString, useQueryStates } from 'nuqs';
import { Info, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ListWithPanel } from '@/components/shared/list-with-panel';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { LookupFilter } from '@/components/shared/lookup-filter';
import { ResponsiveList } from '@/components/shared/responsive-list';
import { StatusTabs } from '@/components/shared/status-tabs';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { useSiteContext } from '@/hooks/use-site-context';
import { formatDate } from '@/lib/date';
import { useSession } from '@/features/auth';
import { useLiveResults } from '@/features/sla-results';
import {
  canCreateRules,
  canDeactivateRule,
  canEditRule,
  PERIOD_LABELS,
  RESULT_STATUS,
  RULE_TYPE_LABELS,
  RULE_TYPES,
  ruleEditHref,
  ruleHistoryHref,
  ruleNewHref,
  ruleViewHref,
  SCOPES,
  siteOverridesOnly,
  useCatalog,
} from '@/features/sla-shared';
import { useRules } from '@/features/sla-rules/api/queries';
import { DeactivateRuleDialog } from '@/features/sla-rules/components/deactivate-rule-dialog';
import {
  LevelRequirementsSummary,
  RuleIndicatorsTable,
} from '@/features/sla-rules/components/rule-contents';

/** @typedef {import('@/features/sla-rules/api/schemas').Rule} Rule */

const TYPE_TABS = [
  { value: RULE_TYPES.SLA, label: 'Aturan SLA' },
  { value: RULE_TYPES.MATURITY, label: 'Aturan maturity' },
];

/** Super Admin "Cakupan" filter. */
const SCOPE_FILTERS = Object.freeze({ ALL: '', DEFAULT: 'default', SITE: 'site' });

const FILTERS = {
  type: parseAsString.withDefault(RULE_TYPES.SLA),
  vendor_id: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  cakupan: parseAsString.withDefault(''),
};

/** @param {string} period */
const periodLabel = (period) =>
  PERIOD_LABELS[/** @type {keyof typeof PERIOD_LABELS} */ (period)] ?? period;

/** `/sla/rules` — "Pengaturan SLA & maturity": the active rules in the user's scope. */
export function RulesView() {
  const { user } = useSession();
  const site = useSiteContext();
  const [filters, setFilters] = useQueryStates(FILTERS, { history: 'replace' });
  const type = filters.type === RULE_TYPES.MATURITY ? RULE_TYPES.MATURITY : RULE_TYPES.SLA;
  const adminOnly = siteOverridesOnly(user);
  // Admin: locked to their active site; Super Admin: the page filters.
  const siteId = adminOnly ? (site.activeSiteId ?? undefined) : filters.site_id || undefined;
  const query = useRules(type, { vendor_id: filters.vendor_id || undefined, site_id: siteId });
  const catalog = useCatalog(type);
  const vendors = useOptionLabels('vendors');
  const sites = useOptionLabels('sites');
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));
  const [deactivating, setDeactivating] = useState(/** @type {Rule | null} */ (null));

  /** @param {Rule} rule */
  const namesOf = (rule) => ({
    vendor: rule.vendor_name ?? vendors.labelOf(rule.vendor_id),
    site: rule.site_id ? (rule.site_name ?? sites.labelOf(rule.site_id)) : 'Default vendor',
  });
  const all = query.data?.data ?? [];
  const rows = all.filter((rule) => {
    if (filters.cakupan === SCOPE_FILTERS.DEFAULT) return !rule.site_id;
    if (filters.cakupan === SCOPE_FILTERS.SITE) return Boolean(rule.site_id);
    return true;
  });
  const selected = rows.find((rule) => rule.id === selectedId) ?? rows[0] ?? null;
  /** @param {Rule} rule */
  const vendorDefaultOf = (rule) =>
    all.find((r) => r.vendor_id === rule.vendor_id && !r.site_id) ?? null;

  /** @param {Rule} rule */
  const actions = (rule) => (
    <span className="flex flex-wrap justify-end gap-1.5">
      {canEditRule(user, rule) ? (
        <Link
          href={ruleEditHref(type, rule.id)}
          className={buttonVariants({ variant: 'outline', className: 'h-9 bg-card' })}
        >
          Edit
        </Link>
      ) : (
        <Link
          href={ruleViewHref(type, rule.id)}
          className={buttonVariants({ variant: 'outline', className: 'h-9 bg-card' })}
        >
          Lihat
        </Link>
      )}
      <Link
        href={ruleHistoryHref(type, rule)}
        className={buttonVariants({ variant: 'outline', className: 'h-9 bg-card' })}
      >
        Riwayat
      </Link>
      {canDeactivateRule(user, rule) ? (
        <Button
          type="button"
          variant="outline"
          className="h-9 bg-card text-danger hover:text-danger"
          onClick={(event) => {
            event.stopPropagation();
            setDeactivating(rule);
          }}
        >
          Nonaktifkan
        </Button>
      ) : null}
    </span>
  );

  const scopeCell = (/** @type {Rule} */ rule) =>
    rule.site_id ? namesOf(rule).site : <Badge variant="info">Default vendor</Badge>;
  const createdText = (/** @type {Rule} */ rule) =>
    [rule.created_at ? formatDate(rule.created_at) : null, rule.created_by_name ?? '—']
      .filter(Boolean)
      .join(' · ');

  const columns = [
    {
      id: 'vendor',
      header: 'Vendor',
      meta: { sortValue: (/** @type {Rule} */ r) => namesOf(r).vendor },
      cell: ({ row }) => <span className="font-semibold">{namesOf(row.original).vendor}</span>,
    },
    {
      id: 'site',
      header: 'Site',
      meta: { sortValue: (/** @type {Rule} */ r) => namesOf(r).site },
      cell: ({ row }) => scopeCell(row.original),
    },
    {
      id: 'period',
      header: 'Periode',
      meta: { sortValue: (/** @type {Rule} */ r) => r.period_type },
      cell: ({ row }) => periodLabel(row.original.period_type),
    },
    {
      id: 'version',
      header: 'Versi',
      meta: { sortValue: (/** @type {Rule} */ r) => r.version },
      cell: ({ row }) => `v${row.original.version ?? '?'}`,
    },
    {
      id: 'created',
      header: 'Dibuat',
      meta: { hideBelow: 'lg', sortValue: (/** @type {Rule} */ r) => r.created_at },
      cell: ({ row }) => <span className="text-muted-foreground">{createdText(row.original)}</span>,
    },
    { id: 'actions', header: 'Aksi', cell: ({ row }) => actions(row.original) },
  ];

  const list = (() => {
    if (query.isPending) return <ListSkeleton rows={4} />;
    if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
    if (rows.length === 0) {
      return (
        <EmptyState
          icon={SlidersHorizontal}
          title="Belum ada aturan"
          description="Belum ada aturan aktif untuk filter ini."
        />
      );
    }
    return (
      <ResponsiveList
        data={rows}
        columns={columns}
        getRowId={(rule) => rule.id}
        caption={`Aturan ${RULE_TYPE_LABELS[type]}`}
        onRowClick={(rule) => setSelectedId(rule.id)}
        isRowSelected={(rule) => rule.id === selected?.id}
        renderCard={(rule) => (
          <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
            <span className="flex items-start justify-between gap-2">
              <span className="font-semibold text-foreground">{namesOf(rule).vendor}</span>
              <span className="text-sm text-muted-foreground">v{rule.version ?? '?'}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {scopeCell(rule)} · {periodLabel(rule.period_type)} · {createdText(rule)}
            </span>
            {actions(rule)}
          </div>
        )}
      />
    );
  })();

  return (
    <>
      <PageHeader
        title="Pengaturan SLA & maturity"
        description={
          adminOnly
            ? 'Aturan khusus site Anda. Aturan default vendor hanya bisa dilihat.'
            : 'Aturan default vendor dan aturan khusus site. Setiap perubahan membuat versi baru.'
        }
        actions={
          canCreateRules(user) ? (
            <>
              <Link
                href={ruleNewHref(RULE_TYPES.MATURITY, {})}
                className={buttonVariants({ variant: 'outline', className: 'h-11 bg-card' })}
              >
                Buat aturan maturity
              </Link>
              <Link
                href={ruleNewHref(RULE_TYPES.SLA, {})}
                className={buttonVariants({ className: 'h-11 font-semibold' })}
              >
                Buat aturan SLA
              </Link>
            </>
          ) : null
        }
      />

      <StatusTabs
        label="Jenis aturan"
        options={TYPE_TABS}
        value={type}
        onChange={(value) => setFilters({ type: value })}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3">
        <LookupFilter
          lookup="vendors"
          params={siteId ? { site_id: siteId } : undefined}
          value={filters.vendor_id}
          onChange={(vendor_id) => setFilters({ vendor_id: vendor_id || null })}
          placeholder="Semua vendor"
          ariaLabel="Filter vendor"
        />
        {adminOnly ? (
          <p className="flex items-center text-sm text-muted-foreground">
            Site: {site.activeSiteId ? sites.labelOf(site.activeSiteId) : site.label}
          </p>
        ) : (
          <>
            <NativeSelect
              aria-label="Filter cakupan"
              className="w-full"
              value={filters.cakupan}
              onChange={(e) => setFilters({ cakupan: e.target.value || null })}
            >
              <NativeSelectOption value={SCOPE_FILTERS.ALL}>Semua cakupan</NativeSelectOption>
              <NativeSelectOption value={SCOPE_FILTERS.DEFAULT}>
                Default vendor saja
              </NativeSelectOption>
              <NativeSelectOption value={SCOPE_FILTERS.SITE}>Aturan khusus site</NativeSelectOption>
            </NativeSelect>
            <LookupFilter
              lookup="sites"
              value={filters.site_id}
              onChange={(site_id) => setFilters({ site_id: site_id || null })}
              placeholder="Semua site"
              ariaLabel="Filter site"
            />
          </>
        )}
      </div>

      {adminOnly ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-info-bg px-4 py-3 text-sm text-info">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Aturan default vendor hanya bisa dilihat. Anda bisa membuat aturan khusus untuk site Anda,
          yang menggantikan aturan default di site tersebut.
        </p>
      ) : (
        <VendorsWithoutRules />
      )}

      <ListWithPanel
        panelLabel="Isi aturan terpilih"
        panel={
          selected ? (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-semibold text-foreground">{namesOf(selected).vendor}</h2>
                <p className="text-sm text-muted-foreground">
                  {namesOf(selected).site} · {periodLabel(selected.period_type)} · v
                  {selected.version ?? '?'}
                </p>
              </div>
              <RuleIndicatorsTable rule={selected} type={type} catalogByCode={catalog.byCode} />
              {type === RULE_TYPES.MATURITY && selected.levels.length ? (
                <LevelRequirementsSummary levels={selected.levels} />
              ) : null}
            </div>
          ) : null
        }
      >
        {list}
      </ListWithPanel>

      <DeactivateRuleDialog
        type={type}
        rule={deactivating}
        vendorDefault={deactivating ? vendorDefaultOf(deactivating) : null}
        namesOf={namesOf}
        onClose={() => setDeactivating(null)}
      />
    </>
  );
}

/**
 * Super Admin: active vendors without an SLA rule — the `NO_RULE` rows of the live vendor scores
 * (never guessed by comparing lists).
 */
function VendorsWithoutRules() {
  const live = useLiveResults({ scope: SCOPES.VENDOR });
  const vendors = useOptionLabels('vendors');
  const missing = (live.data ?? []).filter((row) => row.sla?.status === RESULT_STATUS.NO_RULE);
  if (missing.length === 0) return null;
  return (
    <section
      aria-label="Vendor tanpa aturan SLA"
      className="mb-4 flex flex-col gap-2 rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning"
    >
      <p className="font-semibold">{missing.length} vendor belum punya aturan SLA</p>
      <ul className="flex flex-wrap gap-2">
        {missing.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <span>{row.vendor_name ?? vendors.labelOf(row.vendor_id)}</span>
            <Link
              href={ruleNewHref(RULE_TYPES.SLA, { vendor_id: row.vendor_id ?? '' })}
              className="font-semibold underline"
            >
              Buat aturan
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
