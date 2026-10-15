'use client';

import { useForm } from 'react-hook-form';
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
 * "Buat pipeline" / "Edit pipeline". The vendor is chosen only when creating.
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('@/features/pipelines/api/schemas').Pipeline | null} props.pipeline
 * @param {string} [props.vendorName] Label of the pipeline's vendor (edit).
 * @param {() => void} props.onClose
 */
export function PipelineFormDialog({ open, pipeline, vendorName = '', onClose }) {
  const site = useSiteContext();
  const savePipeline = useSavePipeline();
  const form = useForm({
    resolver: zodResolver(pipelineFormSchema),
    values: {
      vendor: pipeline ? { value: pipeline.vendor_id, label: vendorName } : null,
      name: pipeline?.name ?? '',
      description: pipeline?.description ?? '',
    },
  });
  const { errors } = form.formState;

  const close = () => {
    savePipeline.reset();
    // Back to the record's current values, so a reopened form never shows unsaved input.
    form.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit((values) => {
    savePipeline.mutate(
      { id: pipeline?.id, body: toPipelinePayload(values, !pipeline) },
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
