'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { FILE_RULES, FileField } from '@/components/shared/file-field';
import { FormDialog } from '@/components/shared/form-dialog';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { getErrorMessage } from '@/lib/api/errors';
import { useSavePolicy } from '@/features/policies/api/mutations';
import { policyFormSchema, toPolicyFields } from '@/features/policies/api/schemas';

/**
 * "Upload SOP" (vendor, name, PDF required) / "Edit SOP" (name, PDF optional).
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('@/features/policies/api/schemas').Policy | null} props.policy
 * @param {string} [props.vendorName]
 * @param {() => void} props.onClose
 */
export function PolicyFormDialog({ open, policy, vendorName = '', onClose }) {
  const isNew = !policy;
  const save = useSavePolicy();
  const form = useForm({
    resolver: zodResolver(policyFormSchema(isNew)),
    values: {
      vendor: policy ? { value: policy.vendor_id, label: vendorName } : null,
      name: policy?.name ?? '',
      file: null,
    },
  });
  const { errors } = form.formState;

  const close = () => {
    save.reset();
    // Back to the record's current values, so a reopened form never shows unsaved input.
    form.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(
      { id: policy?.id, fields: toPolicyFields(values, isNew) },
      {
        onSuccess: () => {
          toast.success('SOP berhasil disimpan.');
          close();
        },
      },
    );
  });

  return (
    <FormDialog
      open={open}
      onClose={close}
      title={isNew ? 'Upload SOP' : 'Edit SOP'}
      onSubmit={onSubmit}
      pending={save.isPending}
      error={save.isError ? getErrorMessage(save.error) : null}
      submitLabel={isNew ? 'Upload SOP' : 'Simpan SOP'}
    >
      <Controller
        control={form.control}
        name="vendor"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-2">
            <Label htmlFor="policy-vendor">Vendor</Label>
            <AsyncCombobox
              id="policy-vendor"
              lookup="vendors"
              params={{ status: 'ACTIVE' }}
              value={field.value}
              onChange={field.onChange}
              placeholder="Pilih vendor"
              disabled={!isNew}
              invalid={Boolean(fieldState.error)}
              describedBy={fieldState.error ? 'policy-vendor-error' : undefined}
            />
            {fieldState.error ? (
              <p id="policy-vendor-error" className="text-sm text-destructive">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        )}
      />
      <FormField id="policy-name" label="Nama SOP" error={errors.name?.message}>
        <Input
          {...form.register('name')}
          {...getFieldA11yProps('policy-name', errors.name?.message)}
          placeholder="SOP Kerja di Ketinggian"
          autoComplete="off"
        />
      </FormField>
      <Controller
        control={form.control}
        name="file"
        render={({ field, fieldState }) => (
          <FileField
            label={isNew ? 'File PDF' : 'Ganti file PDF (opsional)'}
            rule={FILE_RULES.PDF}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            currentFileLabel={isNew ? undefined : 'File saat ini dipertahankan'}
          />
        )}
      />
    </FormDialog>
  );
}
