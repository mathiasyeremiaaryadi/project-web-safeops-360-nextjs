'use client';

import { parseAsString, useQueryStates } from 'nuqs';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { isNotFound, NotFoundState } from '@/components/shared/not-found-state';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { useSiteContext } from '@/hooks/use-site-context';
import { useSession } from '@/features/auth';
import {
  canEditRule,
  RULE_TYPE_LABELS,
  RULE_TYPES,
  siteOverridesOnly,
  useCatalog,
} from '@/features/sla-shared';
import { useRule } from '@/features/sla-rules/api/queries';
import { RuleForm } from '@/features/sla-rules/components/rule-form';
import { emptyFormValues, ruleToFormValues } from '@/features/sla-rules/lib/rules';

const PARAMS = {
  type: parseAsString.withDefault(RULE_TYPES.SLA),
  vendor_id: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  view: parseAsString.withDefault(''),
};

/**
 * `/sla/rules/new` and `/sla/rules/[ruleId]/edit`: loads the catalog (and the version to edit),
 * then renders the form. "Lihat" (`?view=1`, or a rule the user may not change) is read-only.
 * @param {{ ruleId?: string }} props
 */
export function RuleFormPage({ ruleId }) {
  const { user } = useSession();
  const site = useSiteContext();
  const [params] = useQueryStates(PARAMS);
  const type = params.type === RULE_TYPES.MATURITY ? RULE_TYPES.MATURITY : RULE_TYPES.SLA;
  const catalog = useCatalog(type);
  const rule = useRule(type, ruleId);
  const vendors = useOptionLabels('vendors');
  const siteOnly = siteOverridesOnly(user);
  const label = RULE_TYPE_LABELS[type];

  if (catalog.isPending || (ruleId && rule.isPending) || vendors.isLoading) {
    return <ListSkeleton rows={5} />;
  }
  if (rule.isError && isNotFound(rule.error)) {
    return (
      <NotFoundState
        description="Aturan ini tidak ada atau di luar akses Anda."
        backHref={`/sla/rules?type=${type}`}
        backLabel="Kembali ke pengaturan SLA"
      />
    );
  }
  if (catalog.isError || rule.isError) {
    return <ErrorState onRetry={() => Promise.all([catalog.refetch(), rule.refetch()])} />;
  }

  if (!ruleId) {
    const vendorId = params.vendor_id;
    const defaults = emptyFormValues(catalog.items, catalog.defaultLevels, {
      vendor: vendorId ? { value: vendorId, label: vendors.labelOf(vendorId) } : null,
      // An Admin creates overrides of their active site.
      siteId: params.site_id || (siteOnly ? (site.activeSiteId ?? '') : ''),
      siteOnly,
    });
    return (
      <>
        <PageHeader title={`Buat aturan ${label}`} />
        <RuleForm
          type={type}
          mode="new"
          defaultValues={defaults}
          catalog={catalog.items}
          defaultLevels={catalog.defaultLevels}
          currentVersion={null}
          siteOnly={siteOnly}
        />
      </>
    );
  }

  const current = /** @type {NonNullable<typeof rule.data>} */ (rule.data);
  const readOnly = params.view === '1' || !canEditRule(user, current);
  const vendorLabel = current.vendor_name ?? vendors.labelOf(current.vendor_id);
  return (
    <>
      <PageHeader
        title={
          readOnly
            ? `Aturan ${label} v${current.version ?? '?'}`
            : `Edit aturan ${label} v${current.version ?? '?'}`
        }
        description={vendorLabel}
      />
      <RuleForm
        type={type}
        mode={readOnly ? 'view' : 'edit'}
        defaultValues={ruleToFormValues(
          current,
          type,
          catalog.items,
          catalog.defaultLevels,
          vendorLabel,
        )}
        catalog={catalog.items}
        defaultLevels={catalog.defaultLevels}
        currentVersion={current.version ?? null}
        siteOnly={siteOnly}
      />
    </>
  );
}
