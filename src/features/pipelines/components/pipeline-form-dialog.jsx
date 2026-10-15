'use client';

import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { ComboboxField } from '@/components/shared/combobox-field';
import { FormDialog } from '@/components/shared/form-dialog';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { useSiteContext } from '@/hooks/use-site-context';
import { getErrorMessage } from '@/lib/api/errors';
import { useVendors } from '@/features/vendors';
import { useSavePipeline } from '@/features/pipelines/api/mutations';
import { pipelineFormSchema, toPipelinePayload } from '@/features/pipelines/api/schemas';

/**
 * "Buat pipeline" / "Edit pipeline". The vendor and site are chosen only when creating: first
 * the vendor, then one of that vendor's sites (Postman: `site_id` must be a site of the vendor,
 * and in an Admin's scope). With one possible site it is pre-filled.
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('@/features/pipelines/api/schemas').Pipeline | null} props.pipeline
 * @param {string} [props.vendorName] Label of the pipeline's vendor (edit).
 * @param {() => void} props.onClose
 */
export function PipelineFormDialog({ open, pipeline, vendorName = '', onClose }) {
  const site = useSiteContext();
  const savePipeline = useSavePipeline();
  const sites = useOptionLabels('sites');
  const vendors = useVendors({ page: 1, limit: 100 });
  const form = useForm({
    resolver: zodResolver(pipelineFormSchema),
    values: {
      isNew: !pipeline,
      site: null,
      vendor: pipeline ? { value: pipeline.vendor_id, label: vendorName } : null,
      name: pipeline?.name ?? '',
      description: pipeline?.description ?? '',
    },
  });
  const { errors } = form.formState;
  const vendorId = useWatch({ control: form.control, name: 'vendor' })?.value;

  // Sites of the chosen vendor, limited to an Admin's own sites.
  const vendorSiteIds = vendors.data?.data.find((v) => v.id === vendorId)?.site_ids ?? [];
  const siteOptions = vendorSiteIds
    .filter((id) => {
      if (!site.scoped) return true;
      // Admin site: locked to the active site (any of their sites when none is chosen).
      if (site.activeSiteId) return id === site.activeSiteId;
      return site.sites.some((option) => option.value === id);
    })
    .map((id) => ({ value: id, label: sites.labelOf(id) }));
  const onlySite = siteOptions.length === 1 ? siteOptions[0] : null;
  const preferred =
    onlySite ?? siteOptions.find((option) => option.value === site.activeSiteId) ?? null;

  // Another vendor: pick its only (or the active) site, else let the user choose.
  useEffect(() => {
    if (!pipeline) form.setValue('site', preferred);
    // `preferred` is derived from vendorId; re-run only when the vendor or its sites change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, pipeline, vendorId, preferred?.value, preferred?.label]);

  const close = () => {
    savePipeline.reset();
    // Back to the record's current values, so a reopened form never shows unsaved input.
    form.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit((values) => {
    savePipeline.mutate(
      { id: pipeline?.id, body: toPipelinePayload(values) },
      {
        onSuccess: () => {
          toast.success('Pipeline berhasil disimpan.');
          close();
        },
      },
    );
  });

  return (
    <FormDialog
      open={open}
      onClose={close}
      title={pipeline ? 'Edit pipeline' : 'Buat pipeline'}
      onSubmit={onSubmit}
      pending={savePipeline.isPending}
      error={
        savePipeline.isError ? getErrorMessage(savePipeline.error, site.saveErrorOverrides) : null
      }
      submitLabel="Simpan pipeline"
    >
      <ComboboxField
        control={form.control}
        name="vendor"
        id="pipeline-vendor"
        label="Vendor"
        lookup="vendors"
        params={site.activeVendorParams}
        placeholder="Pilih vendor"
        disabled={Boolean(pipeline)}
      />
      {pipeline ? null : (
        <Controller
          control={form.control}
          name="site"
          render={({ field, fieldState }) => (
            <FormField id="pipeline-site" label="Site" error={fieldState.error?.message}>
              <NativeSelect
                className="w-full"
                {...getFieldA11yProps('pipeline-site', fieldState.error?.message)}
                disabled={!vendorId}
                value={field.value?.value ?? ''}
                onBlur={field.onBlur}
                onChange={(e) =>
                  field.onChange(siteOptions.find((o) => o.value === e.target.value) ?? null)
                }
              >
                <NativeSelectOption value="">
                  {!vendorId
                    ? 'Pilih vendor dulu'
                    : siteOptions.length
                      ? 'Pilih site'
                      : 'Vendor ini belum punya site'}
                </NativeSelectOption>
                {siteOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
          )}
        />
      )}
      <FormField id="pipeline-name" label="Nama pipeline" error={errors.name?.message}>
        <Input
          {...form.register('name')}
          {...getFieldA11yProps('pipeline-name', errors.name?.message)}
          placeholder="Cleaning Turbine Hall Lt.1"
          autoComplete="off"
        />
      </FormField>
      <FormField
        id="pipeline-description"
        label="Deskripsi (opsional)"
        error={errors.description?.message}
      >
        <Textarea
          {...form.register('description')}
          {...getFieldA11yProps('pipeline-description', errors.description?.message)}
          rows={3}
          className="text-base"
        />
      </FormField>
    </FormDialog>
  );
}
