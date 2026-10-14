'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { FormDialog } from '@/components/shared/form-dialog';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { getErrorMessage } from '@/lib/api/errors';
import { useSaveSite } from '@/features/sites/api/mutations';
import { siteFormSchema, toSitePayload } from '@/features/sites/api/schemas';

/**
 * Add / edit site (one form for both).
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('@/features/sites/api/schemas').Site | null} props.site `null` = new site.
 * @param {() => void} props.onClose
 */
export function SiteFormDialog({ open, site, onClose }) {
  const saveSite = useSaveSite();
  const form = useForm({
    resolver: zodResolver(siteFormSchema),
    values: { code: site?.code ?? '', name: site?.name ?? '', site_type: site?.site_type ?? '' },
  });
  const { errors } = form.formState;

  const close = () => {
    saveSite.reset();
    // Back to the record's current values, so a reopened form never shows unsaved input.
    form.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit((values) => {
    saveSite.mutate(
      { id: site?.id, body: toSitePayload(values) },
      {
        onSuccess: () => {
          toast.success('Site berhasil disimpan.');
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
    saveSite.isError && /** @type {any} */ (saveSite.error).status !== 409
      ? getErrorMessage(saveSite.error)
      : null;

  return (
    <FormDialog
      open={open}
      onClose={close}
      title={site ? 'Edit site' : 'Tambah site'}
      onSubmit={onSubmit}
      pending={saveSite.isPending}
      error={formError}
      submitLabel="Simpan site"
    >
      <FormField id="site-code" label="Kode" error={errors.code?.message}>
        <Input
          {...form.register('code')}
          {...getFieldA11yProps('site-code', errors.code?.message)}
          className="font-mono"
          autoComplete="off"
        />
      </FormField>
      <FormField id="site-name" label="Nama site" error={errors.name?.message}>
        <Input
          {...form.register('name')}
          {...getFieldA11yProps('site-name', errors.name?.message)}
          placeholder="PLTU Paiton"
          autoComplete="off"
        />
      </FormField>
      <FormField id="site-type" label="Tipe (opsional)" error={errors.site_type?.message}>
        <Input
          {...form.register('site_type')}
          {...getFieldA11yProps('site-type', errors.site_type?.message)}
          placeholder="PLTU"
          autoComplete="off"
        />
      </FormField>
    </FormDialog>
  );
}
