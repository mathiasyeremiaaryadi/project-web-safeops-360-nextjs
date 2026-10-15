'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ComboboxField } from '@/components/shared/combobox-field';
import { FormDialog } from '@/components/shared/form-dialog';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { useSiteContext } from '@/hooks/use-site-context';
import { getErrorMessage } from '@/lib/api/errors';
import { useSavePipeline } from '@/features/pipelines/api/mutations';
import { pipelineFormSchema, toPipelinePayload } from '@/features/pipelines/api/schemas';

/**
 * "Buat pipeline" / "Edit pipeline". The site and vendor are chosen only when creating; the
 * vendor list shows the vendors of the chosen site (an Admin's active site is pre-filled).
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('@/features/pipelines/api/schemas').Pipeline | null} props.pipeline
 * @param {string} [props.vendorName] Label of the pipeline's vendor (edit).
 * @param {() => void} props.onClose
 */
export function PipelineFormDialog({ open, pipeline, vendorName = '', onClose }) {
  const site = useSiteContext();
  const savePipeline = useSavePipeline();
  const activeSite = site.sites.find((option) => option.value === site.activeSiteId) ?? null;
  const form = useForm({
    resolver: zodResolver(pipelineFormSchema),
    values: {
      isNew: !pipeline,
      site: pipeline ? null : activeSite,
      vendor: pipeline ? { value: pipeline.vendor_id, label: vendorName } : null,
      name: pipeline?.name ?? '',
      description: pipeline?.description ?? '',
    },
  });
  const { errors } = form.formState;
  const siteId = useWatch({ control: form.control, name: 'site' })?.value;

  // Another site: the chosen vendor may not work there.
  useEffect(() => {
    if (!pipeline) form.setValue('vendor', null);
  }, [form, pipeline, siteId]);

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
      {pipeline ? null : (
        <ComboboxField
          control={form.control}
          name="site"
          id="pipeline-site"
          label="Site"
          lookup="sites"
          placeholder="Pilih site"
        />
      )}
      <ComboboxField
        control={form.control}
        name="vendor"
        id="pipeline-vendor"
        label="Vendor"
        lookup="vendors"
        params={pipeline ? site.activeVendorParams : { status: 'ACTIVE', site_id: siteId }}
        placeholder={pipeline || siteId ? 'Pilih vendor' : 'Pilih site dulu'}
        disabled={Boolean(pipeline) || !siteId}
      />
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
