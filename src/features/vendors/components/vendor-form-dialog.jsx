'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ComboboxField } from '@/components/shared/combobox-field';
import { FormDialog } from '@/components/shared/form-dialog';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { getErrorMessage } from '@/lib/api/errors';
import { useSaveVendor } from '@/features/vendors/api/mutations';
import { toVendorPayload, vendorFormSchema } from '@/features/vendors/api/schemas';

/**
 * Add / edit vendor. Sites are multi-select and saved as `site_ids`.
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('@/features/vendors/api/schemas').Vendor | null} props.vendor `null` = new vendor.
 * @param {(id: string) => string} props.siteName
 * @param {() => void} props.onClose
 */
export function VendorFormDialog({ open, vendor, siteName, onClose }) {
  const saveVendor = useSaveVendor();
  const form = useForm({
    resolver: zodResolver(vendorFormSchema),
    values: {
      code: vendor?.code ?? '',
      name: vendor?.name ?? '',
      sites: (vendor?.site_ids ?? []).map((id) => ({ value: id, label: siteName(id) })),
    },
  });
  const { errors } = form.formState;

  const close = () => {
    saveVendor.reset();
    // Back to the record's current values, so a reopened form never shows unsaved input.
    form.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit((values) => {
    saveVendor.mutate(
      { id: vendor?.id, body: toVendorPayload(values) },
      {
        onSuccess: () => {
          toast.success('Vendor berhasil disimpan.');
          close();
        },
        onError: (error) => {
          if (/** @type {any} */ (error).status === 409) {
            form.setError('code', { message: 'Kode sudah dipakai.' }, { shouldFocus: true });
          }
        },
      },
    );
  });

  const formError =
    saveVendor.isError && /** @type {any} */ (saveVendor.error).status !== 409
      ? getErrorMessage(saveVendor.error)
      : null;

  return (
    <FormDialog
      open={open}
      onClose={close}
      title={vendor ? 'Edit vendor' : 'Tambah vendor'}
      onSubmit={onSubmit}
      pending={saveVendor.isPending}
      error={formError}
      submitLabel="Simpan vendor"
    >
      <FormField id="vendor-code" label="Kode" error={errors.code?.message}>
        <Input
          {...form.register('code')}
          {...getFieldA11yProps('vendor-code', errors.code?.message)}
          placeholder="VND-001"
          className="font-mono"
          autoComplete="off"
        />
      </FormField>
      <FormField id="vendor-name" label="Nama vendor" error={errors.name?.message}>
        <Input
          {...form.register('name')}
          {...getFieldA11yProps('vendor-name', errors.name?.message)}
          placeholder="PT Bersih Jaya"
          autoComplete="off"
        />
      </FormField>
      <ComboboxField
        control={form.control}
        name="sites"
        id="vendor-sites"
        label="Site yang dilayani (opsional)"
        lookup="sites"
        placeholder="Pilih site"
        multiple
      />
    </FormDialog>
  );
}
