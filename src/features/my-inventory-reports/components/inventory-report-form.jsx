'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { StickyActionBar } from '@/components/layout/sticky-action-bar';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { FormAlert, FormCard } from '@/components/shared/form-layout';
import { getErrorMessage } from '@/lib/api/errors';
import { MASTER_STATUS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useCurrentVendorId, withOwnVendor } from '@/features/auth';
import { useInventories } from '@/features/inventories';
import { useCreateInventoryReport } from '@/features/my-inventory-reports/api/inventory-report-api';
import {
  EMPTY_INVENTORY_REPORT,
  inventoryReportFormSchema,
  REPORT_TYPE_OPTIONS,
  toInventoryReportFields,
} from '@/features/my-inventory-reports/lib/form';

const FORM_ID = 'inventory-report-form';

/** "Lapor inventory": request new equipment or report a broken one. The vendor is the worker's. */
export function InventoryReportForm() {
  const vendorId = useCurrentVendorId();
  const create = useCreateInventoryReport();
  const inventories = useInventories({
    page: 1,
    limit: 100,
    vendor_id: vendorId ?? '',
    status: MASTER_STATUS.ACTIVE,
  });
  const options = (inventories.data?.data ?? []).filter(
    (inventory) => inventory.status === MASTER_STATUS.ACTIVE,
  );
  const form = useForm({
    resolver: zodResolver(inventoryReportFormSchema),
    defaultValues: EMPTY_INVENTORY_REPORT,
  });
  const errors = form.formState.errors;
  const damaged = useWatch({ control: form.control, name: 'report_type' }) === 'DAMAGED';

  const onSubmit = form.handleSubmit((values) => {
    if (!vendorId) return;
    create.mutate(withOwnVendor(toInventoryReportFields(values), vendorId), {
      onSuccess: () => {
        toast.success('Laporan inventory terkirim.');
        form.reset(EMPTY_INVENTORY_REPORT);
      },
    });
  });

  const formError = create.isError ? getErrorMessage(create.error) : null;

  return (
    <form
      id={FORM_ID}
      method="post"
      noValidate
      onSubmit={onSubmit}
      aria-busy={create.isPending}
      className="flex min-w-0 flex-col gap-4"
    >
      <FormCard title="Laporan baru">
        <div className="flex flex-col gap-5">
          <fieldset aria-describedby={errors.report_type ? 'report-type-error' : undefined}>
            <legend className="mb-2 text-[15px] font-medium text-foreground sm:text-sm">
              Jenis laporan
            </legend>
            <Controller
              control={form.control}
              name="report_type"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {REPORT_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3.5',
                        'has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                      )}
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={option.value}
                        checked={field.value === option.value}
                        onChange={() => field.onChange(option.value)}
                        onBlur={field.onBlur}
                        className="mt-1 size-4 accent-primary"
                      />
                      <span className="flex flex-col">
                        <span className="font-semibold text-foreground">{option.label}</span>
                        <span className="text-sm text-muted-foreground">{option.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.report_type ? (
              <p id="report-type-error" className="pt-1.5 text-sm text-destructive">
                {errors.report_type.message}
              </p>
            ) : null}
          </fieldset>

          <FormField
            id="report-inventory"
            label={damaged ? 'Inventory' : 'Inventory (opsional)'}
            error={errors.inventory_id?.message}
          >
            <NativeSelect
              className="w-full"
              {...getFieldA11yProps('report-inventory', errors.inventory_id?.message)}
              {...form.register('inventory_id')}
            >
              <NativeSelectOption value="">
                {inventories.isPending ? 'Memuat inventory…' : 'Pilih inventory'}
              </NativeSelectOption>
              {options.map((inventory) => (
                <NativeSelectOption key={inventory.id} value={inventory.id}>
                  {inventory.item}
                  {inventory.jenis_item ? ` · ${inventory.jenis_item}` : ''}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>

          <FormField id="report-description" label="Keterangan" error={errors.description?.message}>
            <Textarea
              rows={4}
              maxLength={1000}
              placeholder="Contoh: sarung tangan robek, butuh 2 pasang"
              {...getFieldA11yProps('report-description', errors.description?.message)}
              {...form.register('description')}
            />
          </FormField>

          <p className="text-sm text-muted-foreground">
            Foto evidence belum bisa dilampirkan: server belum menyediakan unggah foto.
          </p>
        </div>
      </FormCard>

      <FormAlert message={formError} />

      <StickyActionBar>
        <Button
          type="submit"
          form={FORM_ID}
          disabled={create.isPending || !vendorId}
          className="h-12 font-semibold md:h-11"
        >
          {create.isPending ? 'Mengirim…' : 'Kirim laporan'}
        </Button>
      </StickyActionBar>
    </form>
  );
}
