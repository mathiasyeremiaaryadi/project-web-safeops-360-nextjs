'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog } from '@/components/shared/form-dialog';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { getErrorMessage } from '@/lib/api/errors';
import { useSaveItem } from '@/features/items/api/mutations';
import { itemFormSchema, toItemPayload } from '@/features/items/api/schemas';

/**
 * Add / edit master task.
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('@/features/items/api/schemas').Item | null} props.item `null` = new task.
 * @param {() => void} props.onClose
 */
export function ItemFormDialog({ open, item, onClose }) {
  const saveItem = useSaveItem();
  const form = useForm({
    resolver: zodResolver(itemFormSchema),
    values: { name: item?.name ?? '', description: item?.description ?? '' },
  });
  const { errors } = form.formState;

  const close = () => {
    saveItem.reset();
    // Back to the record's current values, so a reopened form never shows unsaved input.
    form.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit((values) => {
    saveItem.mutate(
      { id: item?.id, body: toItemPayload(values) },
      {
        onSuccess: () => {
          toast.success('Task berhasil disimpan.');
          close();
        },
      },
    );
  });

  return (
    <FormDialog
      open={open}
      onClose={close}
      title={item ? 'Edit task' : 'Tambah task'}
      description="Master task dipakai bersama oleh semua pipeline vendor."
      onSubmit={onSubmit}
      pending={saveItem.isPending}
      error={saveItem.isError ? getErrorMessage(saveItem.error) : null}
      submitLabel="Simpan task"
    >
      <FormField id="item-name" label="Nama task" error={errors.name?.message}>
        <Input
          {...form.register('name')}
          {...getFieldA11yProps('item-name', errors.name?.message)}
          placeholder="Sapu area turbin"
          autoComplete="off"
        />
      </FormField>
      <FormField
        id="item-description"
        label="Deskripsi (opsional)"
        error={errors.description?.message}
      >
        <Textarea
          {...form.register('description')}
          {...getFieldA11yProps('item-description', errors.description?.message)}
          rows={3}
          className="text-base"
        />
      </FormField>
    </FormDialog>
  );
}
