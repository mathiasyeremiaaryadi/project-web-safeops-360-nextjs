'use client';

import { useState } from 'react';
import Link from 'next/link';
import { parseAsString, useQueryStates } from 'nuqs';
import { History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { useSession } from '@/features/auth';
import {
  canEditRule,
  PERIOD_LABELS,
  RULE_TYPE_LABELS,
  RULE_TYPES,
  ruleEditHref,
  useCatalog,
} from '@/features/sla-shared';
import { useRuleHistory } from '@/features/sla-rules/api/queries';
import {
  LevelRequirementsSummary,
  RuleIndicatorsTable,
} from '@/features/sla-rules/components/rule-contents';
import { diffVersions } from '@/features/sla-rules/lib/rules';

const PARAMS = {
  type: parseAsString.withDefault(RULE_TYPES.SLA),
  vendor_id: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
};

/** `/sla/rules/history` — every version of a vendor (+ site) rule, newest first. */
export function RuleHistoryView() {
  const { user } = useSession();
  const [params] = useQueryStates(PARAMS);
  const type = params.type === RULE_TYPES.MATURITY ? RULE_TYPES.MATURITY : RULE_TYPES.SLA;
  const query = useRuleHistory(type, {
    vendor_id: params.vendor_id,
    site_id: params.site_id || undefined,
  });
  const catalog = useCatalog(type);
  const vendors = useOptionLabels('vendors');
  const sites = useOptionLabels('sites');
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));

  // The history may also hold versions of other sites: keep this vendor + site only.
  const versions = (query.data?.data ?? [])
    .filter((rule) => (rule.site_id ?? '') === params.site_id)
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  const diffs = versions.map((rule, index) =>
    diffVersions(versions[index + 1] ?? null, rule, type, catalog.byCode),
  );
  const selectedIndex = Math.max(
    0,
    versions.findIndex((rule) => rule.id === selectedId),
  );
  const selected = versions[selectedIndex];
  const active = versions.find((rule) => rule.is_active);
  const vendorName = versions[0]?.vendor_name ?? vendors.labelOf(params.vendor_id);
  const scope = params.site_id ? sites.labelOf(params.site_id) : 'Default vendor';

  return (
    <>
      <PageHeader
        title={`Riwayat aturan ${RULE_TYPE_LABELS[type]}`}
        description={`${vendorName} · ${scope}`}
        actions={
          active && canEditRule(user, active) ? (
            <Link
              href={ruleEditHref(type, active.id)}
              className={buttonVariants({ className: 'h-11 font-semibold' })}
            >
              Edit (buat v{(active.version ?? 0) + 1})
            </Link>
          ) : null
        }
      />
      {query.isPending ? <ListSkeleton rows={3} /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.isSuccess && versions.length === 0 ? (
        <EmptyState icon={History} title="Belum ada versi" />
      ) : null}
      {selected ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
          <ol className="flex flex-col gap-2" aria-label="Daftar versi">
            {versions.map((rule, index) => (
              <li key={rule.id}>
                <button
                  type="button"
                  aria-pressed={index === selectedIndex}
                  onClick={() => setSelectedId(rule.id)}
                  className={cn(
                    'flex w-full flex-col gap-1 rounded-xl border bg-card p-3.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    index === selectedIndex && 'border-primary bg-primary/5',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">v{rule.version ?? '?'}</span>
                    {rule.is_active ? <Badge variant="success">Aktif</Badge> : null}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDateTime(rule.created_at)} · {rule.created_by_name ?? '—'}
                  </span>
                  <span className="text-foreground">{diffs[index].summary}</span>
                </button>
              </li>
            ))}
          </ol>
          <section
            aria-label={`Isi v${selected.version ?? '?'}`}
            className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5"
          >
            <h2 className="font-semibold text-foreground">
              v{selected.version ?? '?'} ·{' '}
              <span className={cn(diffs[selectedIndex].periodChanged && 'text-warning')}>
                {PERIOD_LABELS[/** @type {keyof typeof PERIOD_LABELS} */ (selected.period_type)] ??
                  selected.period_type}
              </span>
            </h2>
            <RuleIndicatorsTable
              rule={selected}
              type={type}
              catalogByCode={catalog.byCode}
              changed={diffs[selectedIndex].changed}
            />
            {type === RULE_TYPES.MATURITY && selected.levels.length ? (
              <LevelRequirementsSummary
                levels={selected.levels}
                changedLevels={diffs[selectedIndex].levelsChanged}
              />
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
