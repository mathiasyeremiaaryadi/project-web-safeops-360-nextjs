'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ComboboxField } from '@/components/shared/combobox-field';
import { FILE_RULES, FileField } from '@/components/shared/file-field';
import { FormDialog } from '@/components/shared/form-dialog';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { getErrorMessage } from '@/lib/api/errors';
import { useSaveInventory } from '@/features/inventories/api/mutations';
import { inventoryFormSchema, toInventoryFields } from '@/features/inventories/api/schemas';
import { INVENTORY_CONDITION_BADGES } from '@/features/inventories/lib/constants';

/**
 * Add / edit inventory (multipart, optional photo).
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('@/features/inventories/api/schemas').Inventory | null} props.inventory
 * @param {string} [props.vendorName] Label of the inventory's vendor (edit).
 * @param {() => void} props.onClose
 */
export function InventoryFormDialog({ open, inventory, vendorName = '', onClose }) {
  const save = useSaveInventory();
  const form = useForm({
    resolver: zodResolver(inventoryFormSchema),
    values: {
      vendor: inventory ? { value: inventory.vendor_id, label: vendorName } : null,
      item: inventory?.item ?? '',
      jenis_item: inventory?.jenis_item ?? '',
      qty: inventory ? String(inventory.qty) : '',
      status_condition: /** @type {any} */ (inventory?.status_condition ?? ''),
      image: null,
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
      { id: inventory?.id, body: toInventoryFields(values) },
      {
        onSuccess: () => {
          toast.success('Inventory berhasil disimpan.');
          close();
        },
      },
    );
  });

  return (
    <FormDialog
      open={open}
      onClose={close}
      title={inventory ? 'Edit inventory' : 'Tambah inventory'}
      onSubmit={onSubmit}
      pending={save.isPending}
      error={save.isError ? getErrorMessage(save.error) : null}
      submitLabel="Simpan inventory"
    >
      <ComboboxField
        control={form.control}
        name="vendor"
        id="inventory-vendor"
        label="Vendor"
        lookup="vendors"
        params={{ status: 'ACTIVE' }}
        placeholder="Pilih vendor"
      />
      <FormField id="inventory-item" label="Nama item" error={errors.item?.message}>
        <Input
          {...form.register('item')}
          {...getFieldA11yProps('inventory-item', errors.item?.message)}
          placeholder="APAR 6 kg"
          autoComplete="off"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="inventory-type" label="Jenis item" error={errors.jenis_item?.message}>
          <Input
            {...form.register('jenis_item')}
            {...getFieldA11yProps('inventory-type', errors.jenis_item?.message)}
            placeholder="Alat pemadam"
            autoComplete="off"
          />
        </FormField>
        <FormField id="inventory-qty" label="Jumlah" error={errors.qty?.message}>
          <Input
            {...form.register('qty')}
            {...getFieldA11yProps('inventory-qty', errors.qty?.message)}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
          />
        </FormField>
      </div>
      <FormField id="inventory-condition" label="Kondisi" error={errors.status_condition?.message}>
        <NativeSelect
          {...form.register('status_condition')}
          {...getFieldA11yProps('inventory-condition', errors.status_condition?.message)}
          className="w-full"
        >
          <NativeSelectOption value="">Pilih kondisi</NativeSelectOption>
          {Object.entries(INVENTORY_CONDITION_BADGES).map(([value, badge]) => (
            <NativeSelectOption key={value} value={value}>
              {badge.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <Controller
        control={form.control}
        name="image"
        render={({ field }) => (
          <FileField
            label="Foto (opsional)"
            rule={FILE_RULES.IMAGE}
            value={field.value}
            onChange={field.onChange}
            currentFileLabel={inventory?.image_url ? 'Foto saat ini dipertahankan' : undefined}
          />
        )}
      />
    </FormDialog>
  );
}
