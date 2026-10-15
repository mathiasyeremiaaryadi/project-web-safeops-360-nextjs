'use client';

import { useWatch } from 'react-hook-form';
import { CheckCircle2, CircleAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  DIRECTIONS,
  INDICATOR_LABELS,
  indicatorLabel,
  LEVEL_NAMES,
  RULE_TYPES,
  UNITS,
} from '@/features/sla-shared';
import { levelsToInputs, weightStatus } from '@/features/sla-rules/lib/rules';

/** @typedef {import('@/features/sla-rules/api/schemas').CatalogItem} CatalogItem */
/** @typedef {import('react-hook-form').UseFormReturn<import('@/features/sla-rules/lib/rules').RuleFormValues>} RuleForm */

const UNIT_TEXT = Object.freeze({
  [UNITS.PERCENT]: '%',
  [UNITS.MINUTES]: 'menit',
  [UNITS.SCORE]: 'skor',
});

const NUMBER_INPUT = 'h-10 w-24 text-right tabular-nums';

/** @param {{ message?: string, id: string }} props */
const FieldError = ({ message, id }) =>
  message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;

/**
 * One row per catalog item: "pakai" checkbox, label and description, weight, and (SLA) target
 * with ≥ / ≤ and its unit. An unused item shows "Tidak dipakai".
 * @param {{ form: RuleForm, type: 'sla' | 'maturity', catalog: CatalogItem[], disabled: boolean }} props
 */
export function IndicatorRows({ form, type, catalog, disabled }) {
  const items = useWatch({ control: form.control, name: 'items' });
  const errors = form.formState.errors.items ?? {};
  return (
    <ul className="flex flex-col divide-y">
      {catalog.map((item) => {
        const id = `item-${item.code}`;
        const enabled = Boolean(items?.[item.code]?.enabled);
        const rowErrors = /** @type {any} */ (errors)[item.code] ?? {};
        const description =
          INDICATOR_LABELS[/** @type {keyof typeof INDICATOR_LABELS} */ (item.code)]?.description;
        return (
          <li key={item.code} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start">
            <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
              <input
                id={id}
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                disabled={disabled}
                {...form.register(`items.${item.code}.enabled`)}
              />
              <span className="flex flex-col">
                <span className="font-medium text-foreground">{indicatorLabel(item.code)}</span>
                {description ? (
                  <span className="text-sm text-muted-foreground">{description}</span>
                ) : null}
              </span>
            </label>
            {enabled ? (
              <div className="flex flex-wrap gap-4 pl-7 sm:pl-0">
                <div className="flex flex-col gap-1">
                  <label htmlFor={`${id}-weight`} className="text-xs text-muted-foreground">
                    Bobot (%)
                  </label>
                  <Input
                    id={`${id}-weight`}
                    inputMode="decimal"
                    className={NUMBER_INPUT}
                    disabled={disabled}
                    aria-invalid={rowErrors.weight ? true : undefined}
                    aria-describedby={rowErrors.weight ? `${id}-weight-error` : undefined}
                    {...form.register(`items.${item.code}.weight`)}
                  />
                  <FieldError id={`${id}-weight-error`} message={rowErrors.weight?.message} />
                </div>
                {type === RULE_TYPES.SLA ? (
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`${id}-target`} className="text-xs text-muted-foreground">
                      Target ({item.direction === DIRECTIONS.DOWN ? '≤' : '≥'}{' '}
                      {UNIT_TEXT[/** @type {keyof typeof UNIT_TEXT} */ (item.unit)]})
                    </label>
                    <Input
                      id={`${id}-target`}
                      inputMode="decimal"
                      className={NUMBER_INPUT}
                      disabled={disabled}
                      aria-invalid={rowErrors.target ? true : undefined}
                      aria-describedby={rowErrors.target ? `${id}-target-error` : undefined}
                      {...form.register(`items.${item.code}.target`)}
                    />
                    <FieldError id={`${id}-target-error`} message={rowErrors.target?.message} />
                  </div>
                ) : null}
              </div>
            ) : (
              <span className="pl-7 text-sm text-muted-foreground sm:pl-0">Tidak dipakai</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Live total: green when exactly 100, red (`role="alert"`) with what is missing / too much.
 * @param {{ form: RuleForm }} props
 */
export function WeightTotal({ form }) {
  const items = useWatch({ control: form.control, name: 'items' }) ?? {};
  const status = weightStatus(items);
  const Icon = status.valid ? CheckCircle2 : CircleAlert;
  return (
    <p
      role={status.valid ? 'status' : 'alert'}
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium',
        status.valid ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger',
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {status.message}
    </p>
  );
}

const LEVEL_COLUMNS = /** @type {const} */ ([
  ['min_score', 'Skor minimum'],
  ['min_dimension', 'Nilai minimum per dimensi'],
  ['consecutive_periods', 'Periode berturut-turut'],
]);

/**
 * Maturity level requirements (Level 2–5), filled from the catalog defaults.
 * @param {{ form: RuleForm, defaultLevels: import('@/features/sla-rules/api/schemas').LevelRequirement[], disabled: boolean }} props
 */
export function LevelRequirementsTable({ form, defaultLevels, disabled }) {
  const levels = useWatch({ control: form.control, name: 'levels' }) ?? [];
  const errors = /** @type {any} */ (form.formState.errors.levels) ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">Syarat level maturity</caption>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">
                Level
              </th>
              {LEVEL_COLUMNS.map(([, label]) => (
                <th key={label} scope="col" className="py-2 pr-3 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((row, index) => (
              <tr key={row.level} className="border-b align-top last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-medium text-foreground">
                  Level {row.level} ·{' '}
                  {LEVEL_NAMES[/** @type {keyof typeof LEVEL_NAMES} */ (row.level)]}
                </th>
                {LEVEL_COLUMNS.map(([field, label]) => {
                  const id = `level-${row.level}-${field}`;
                  const message = errors[index]?.[field]?.message;
                  return (
                    <td key={field} className="py-2 pr-3">
                      <Input
                        id={id}
                        inputMode="decimal"
                        aria-label={`${label} Level ${row.level}`}
                        aria-invalid={message ? true : undefined}
                        aria-describedby={message ? `${id}-error` : undefined}
                        className={NUMBER_INPUT}
                        disabled={disabled}
                        {...form.register(`levels.${index}.${field}`)}
                      />
                      <FieldError id={`${id}-error`} message={message} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Nilai tiap kolom harus sama atau naik dari level di bawahnya. Level 1 (Awal) berlaku jika
        syarat Level 2 belum terpenuhi.
      </p>
      {disabled ? null : (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-fit bg-card"
          onClick={() =>
            form.setValue('levels', levelsToInputs(defaultLevels), {
              shouldDirty: true,
              shouldValidate: form.formState.isSubmitted,
            })
          }
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Kembalikan default
        </Button>
      )}
    </div>
  );
}
