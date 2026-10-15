'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { StickyActionBar } from '@/components/layout/sticky-action-bar';
import { ComboboxField } from '@/components/shared/combobox-field';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { FormAlert, FormCard } from '@/components/shared/form-layout';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { useSiteContext } from '@/hooks/use-site-context';
import { getErrorMessage } from '@/lib/api/errors';
import { MASTER_STATUS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useVendors } from '@/features/vendors';
import {
  PERIOD_LABELS,
  PERIOD_TYPES,
  RULE_TYPE_LABELS,
  RULE_TYPES,
  ruleViewHref,
} from '@/features/sla-shared';
import { useCreateRule, useRules } from '@/features/sla-rules/api/queries';
import {
  IndicatorRows,
  LevelRequirementsTable,
  WeightTotal,
} from '@/features/sla-rules/components/rule-form-parts';
import {
  RULE_SCOPES,
  ruleFormSchema,
  toRulePayload,
  weightStatus,
} from '@/features/sla-rules/lib/rules';

/** @typedef {import('@/features/sla-rules/lib/rules').RuleFormValues} RuleFormValues */
/** @typedef {import('@/features/sla-rules/api/schemas').CatalogItem} CatalogItem */
/** @typedef {import('@/features/sla-rules/api/schemas').LevelRequirement} LevelRequirement */

const SAVE_ERRORS = { 403: 'Anda tidak berhak membuat aturan untuk cakupan ini.' };

const SCOPE_OPTIONS = [
  { value: RULE_SCOPES.DEFAULT, label: 'Default vendor', hint: 'Berlaku di semua site vendor.' },
  {
    value: RULE_SCOPES.SITE,
    label: 'Aturan khusus site',
    hint: 'Menggantikan aturan default di satu site.',
  },
];

/** @param {string} period */
const periodLabel = (period) =>
  PERIOD_LABELS[/** @type {keyof typeof PERIOD_LABELS} */ (period)] ?? period;

/**
 * The one form of SLA and maturity rules. "Edit" and "new" both post a NEW version; "view" is
 * the same form, read-only, without the action bar.
 * @param {object} props
 * @param {'sla' | 'maturity'} props.type
 * @param {'new' | 'edit' | 'view'} props.mode
 * @param {RuleFormValues} props.defaultValues
 * @param {CatalogItem[]} props.catalog
 * @param {LevelRequirement[]} props.defaultLevels
 * @param {number | null} props.currentVersion Version replaced by this one (edit), else `null`.
 * @param {boolean} props.siteOnly Admin: site overrides only.
 */
export function RuleForm({
  type,
  mode,
  defaultValues,
  catalog,
  defaultLevels,
  currentVersion,
  siteOnly,
}) {
  const router = useRouter();
  const site = useSiteContext();
  const create = useCreateRule(type);
  const units = Object.fromEntries(catalog.map((item) => [item.code, item.unit]));
  const form = useForm({
    resolver: zodResolver(ruleFormSchema(type, { units, siteOnly })),
    defaultValues,
  });
  const readOnly = mode === 'view';
  const locked = mode !== 'new';
  const [vendor, scope, siteId, periodType, items] = useWatch({
    control: form.control,
    name: ['vendor', 'scope', 'site_id', 'period_type', 'items'],
  });
  const vendors = useVendors({ page: 1, limit: 100 });
  const siteLabels = useOptionLabels('sites');
  const sameScope = useRules(type, { vendor_id: vendor?.value });
  const active = (sameScope.data?.data ?? []).filter((rule) => rule.vendor_id === vendor?.value);
  const replaced = active.find(
    (rule) => (rule.site_id ?? '') === (scope === RULE_SCOPES.SITE ? siteId : ''),
  );
  const vendorDefault = active.find((rule) => !rule.site_id) ?? null;
  const nextVersion = (currentVersion ?? replaced?.version ?? 0) + 1;

  // Sites of the chosen vendor; an Admin only sees their own.
  const siteOptions = (vendors.data?.data.find((v) => v.id === vendor?.value)?.site_ids ?? [])
    .filter((id) => !site.scoped || site.sites.some((option) => option.value === id))
    .map((id) => ({ value: id, label: siteLabels.labelOf(id) }));

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(toRulePayload(values, type, defaultLevels), {
      onSuccess: () => {
        toast.success(`Aturan ${RULE_TYPE_LABELS[type]} v${nextVersion} disimpan`);
        router.push(`/sla/rules?type=${type}`);
      },
    });
  });

  const formError = create.isError ? getErrorMessage(create.error, SAVE_ERRORS) : null;
  // The weight total has its own live message; only "Pilih minimal satu indikator." shows here.
  const itemsMessage = /** @type {any} */ (form.formState.errors.items)?.message;
  const itemsError = itemsMessage && !itemsMessage.startsWith('Total') ? itemsMessage : null;
  let submitLabel = mode === 'edit' ? `Simpan sebagai v${nextVersion}` : 'Simpan aturan';
  if (create.isPending) submitLabel = 'Menyimpan…';
  const scopeText = scope === RULE_SCOPES.SITE ? siteLabels.labelOf(siteId) : 'Default vendor';

  return (
    <form
      method="post"
      noValidate
      onSubmit={onSubmit}
      aria-busy={create.isPending}
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:grid-cols-[minmax(0,1fr)_380px]"
    >
      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-4">
        {mode === 'edit' ? (
          <p className="flex items-start gap-2 rounded-xl bg-info-bg px-4 py-3 text-sm text-info">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Menyimpan form ini membuat versi baru (v{nextVersion}) yang menggantikan v
            {currentVersion}. Versi lama tetap tersimpan di riwayat.
          </p>
        ) : null}

        <FormCard title="Cakupan & periode">
          <div className="flex flex-col gap-5">
            {locked ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Vendor</dt>
                  <dd className="font-medium text-foreground">{vendor?.label ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Berlaku untuk</dt>
                  <dd className="font-medium text-foreground">{scopeText}</dd>
                </div>
              </dl>
            ) : (
              <>
                <ComboboxField
                  control={form.control}
                  name="vendor"
                  id="rule-vendor"
                  label="Vendor"
                  lookup="vendors"
                  params={site.scoped ? site.activeVendorParams : { status: MASTER_STATUS.ACTIVE }}
                  placeholder="Pilih vendor"
                />
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-foreground">
                    Berlaku untuk
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SCOPE_OPTIONS.map((option) => {
                      const disabledOption = siteOnly && option.value === RULE_SCOPES.DEFAULT;
                      return (
                        <label
                          key={option.value}
                          className={cn(
                            'flex items-start gap-3 rounded-xl border bg-card p-3.5',
                            'has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                            disabledOption ? 'opacity-60' : 'cursor-pointer',
                          )}
                        >
                          <input
                            type="radio"
                            value={option.value}
                            disabled={disabledOption}
                            className="mt-1 size-4 accent-primary"
                            {...form.register('scope')}
                          />
                          <span className="flex flex-col">
                            <span className="font-semibold text-foreground">{option.label}</span>
                            <span className="text-sm text-muted-foreground">
                              {disabledOption
                                ? 'Hanya Super Admin yang bisa membuat aturan default vendor.'
                                : option.hint}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {form.formState.errors.scope ? (
                    <p className="pt-1.5 text-sm text-destructive">
                      {form.formState.errors.scope.message}
                    </p>
                  ) : null}
                </fieldset>
                {scope === RULE_SCOPES.SITE ? (
                  <FormField
                    id="rule-site"
                    label="Site"
                    error={form.formState.errors.site_id?.message}
                  >
                    <NativeSelect
                      className="w-full"
                      disabled={!vendor}
                      {...getFieldA11yProps('rule-site', form.formState.errors.site_id?.message)}
                      {...form.register('site_id')}
                    >
                      <NativeSelectOption value="">
                        {vendor ? 'Pilih site' : 'Pilih vendor dulu'}
                      </NativeSelectOption>
                      {siteOptions.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FormField>
                ) : null}
              </>
            )}

            <Controller
              control={form.control}
              name="period_type"
              render={({ field }) => (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-foreground">Periode</legend>
                  <div className="inline-flex gap-1 rounded-xl border bg-card p-1">
                    {Object.values(PERIOD_TYPES).map((period) => (
                      <label
                        key={period}
                        className={cn(
                          'flex h-10 cursor-pointer items-center rounded-lg px-3.5 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                          field.value === period
                            ? 'bg-primary font-semibold text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        <input
                          type="radio"
                          name={field.name}
                          value={period}
                          checked={field.value === period}
                          onChange={() => field.onChange(period)}
                          className="sr-only"
                        />
                        {periodLabel(period)}
                      </label>
                    ))}
                  </div>
                  <p className="pt-1.5 text-xs text-muted-foreground">
                    Perubahan periode berlaku mulai periode berikutnya.
                  </p>
                </fieldset>
              )}
            />
          </div>
        </FormCard>

        <FormCard title={type === RULE_TYPES.SLA ? 'Indikator SLA' : 'Dimensi maturity'}>
          <IndicatorRows form={form} type={type} catalog={catalog} disabled={readOnly} />
          {itemsError ? (
            <p role="alert" className="pt-2 text-sm text-destructive">
              {itemsError}
            </p>
          ) : null}
          <div className="mt-4">
            <WeightTotal form={form} />
          </div>
        </FormCard>

        {type === RULE_TYPES.MATURITY ? (
          <FormCard title="Syarat level">
            <LevelRequirementsTable form={form} defaultLevels={defaultLevels} disabled={readOnly} />
          </FormCard>
        ) : null}

        <FormAlert message={formError} />
      </fieldset>

      <aside className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold text-foreground">Ringkasan</h2>
        <dl className="grid gap-3 text-sm">
          {[
            ['Vendor', vendor?.label ?? '—'],
            ['Cakupan', scopeText],
            ['Periode', periodLabel(periodType)],
            ['Versi baru', readOnly ? `v${currentVersion ?? '?'}` : `v${nextVersion}`],
            ['Total bobot', `${weightStatus(items ?? {}).total.toLocaleString('id-ID')} / 100`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        {scope === RULE_SCOPES.SITE && vendorDefault ? (
          <div className="rounded-xl bg-muted/50 p-3 text-sm">
            <p className="font-medium text-foreground">Yang berlaku sekarang</p>
            <p className="text-muted-foreground">
              Aturan default vendor v{vendorDefault.version ?? '?'} (
              {periodLabel(vendorDefault.period_type)})
            </p>
            <Link
              href={ruleViewHref(type, vendorDefault.id)}
              className="font-semibold text-primary hover:underline"
            >
              Lihat aturan default vendor
            </Link>
          </div>
        ) : null}
        <p className="flex items-start gap-2 text-sm text-warning">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Perubahan langsung tercermin di skor sementara periode berjalan. Periode yang sudah
          ditutup tidak berubah.
        </p>
      </aside>

      {readOnly ? null : (
        <StickyActionBar className="lg:col-span-2">
          <Link
            href={`/sla/rules?type=${type}`}
            className={buttonVariants({ variant: 'outline', className: 'h-12 bg-card md:h-11' })}
          >
            Batal
          </Link>
          <Button
            type="submit"
            disabled={create.isPending || !weightStatus(items ?? {}).valid}
            className="h-12 font-semibold md:h-11"
          >
            {submitLabel}
          </Button>
        </StickyActionBar>
      )}
    </form>
  );
}
