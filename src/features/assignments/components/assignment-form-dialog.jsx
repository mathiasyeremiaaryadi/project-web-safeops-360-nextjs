'use client';

import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ComboboxField } from '@/components/shared/combobox-field';
import { FormDialog } from '@/components/shared/form-dialog';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { getErrorMessage } from '@/lib/api/errors';
import { MASTER_STATUS } from '@/lib/constants';
import { usePipelineItems } from '@/features/pipelines';
import { useCreateAssignment } from '@/features/assignments/api/queries';
import { assignmentFormSchema, toAssignmentPayload } from '@/features/assignments/api/schemas';

const EMPTY = { pipeline: null, pipeline_item_id: '', worker: null };

const ERRORS = {
  409: 'Worker ini sudah ditugaskan ke task tersebut.',
  422: 'Worker harus aktif dan termasuk vendor pemilik pipeline.',
};

/**
 * "Tambah penugasan": choose a pipeline, one of its active tasks, then a worker of the vendor.
 * No shift here: the worker chooses it per report (Postman).
 * @param {{ open: boolean, onClose: () => void }} props
 */
export function AssignmentFormDialog({ open, onClose }) {
  const create = useCreateAssignment();
  const items = useOptionLabels('items');
  const form = useForm({ resolver: zodResolver(assignmentFormSchema), defaultValues: EMPTY });
  const pipelineId = useWatch({ control: form.control, name: 'pipeline' })?.value ?? '';
  const pipelineItems = usePipelineItems(pipelineId);
  const tasks = pipelineId
    ? (pipelineItems.data?.data ?? [])
        .filter((task) => task.status === MASTER_STATUS.ACTIVE)
        .sort((a, b) => a.sort_order - b.sort_order)
    : [];

  // Another pipeline: its tasks are different.
  useEffect(() => {
    form.setValue('pipeline_item_id', '');
  }, [form, pipelineId]);

  const close = () => {
    create.reset();
    form.reset(EMPTY);
    onClose();
  };

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(toAssignmentPayload(values), {
      onSuccess: () => {
        toast.success('Worker berhasil ditugaskan.');
        close();
      },
    });
  });

  return (
    <FormDialog
      open={open}
      onClose={close}
      title="Tambah penugasan"
      description="Shift tidak dipilih di sini: worker memilihnya saat membuat laporan."
      onSubmit={onSubmit}
      pending={create.isPending}
      error={create.isError ? getErrorMessage(create.error, ERRORS) : null}
      submitLabel="Tugaskan"
    >
      <ComboboxField
        control={form.control}
        name="pipeline"
        id="assignment-pipeline"
        label="Pipeline"
        lookup="pipelines"
        params={{ status: MASTER_STATUS.ACTIVE }}
        placeholder="Pilih pipeline"
      />
      <Controller
        control={form.control}
        name="pipeline_item_id"
        render={({ field, fieldState }) => (
          <FormField id="assignment-task" label="Task" error={fieldState.error?.message}>
            <NativeSelect
              className="w-full"
              {...getFieldA11yProps('assignment-task', fieldState.error?.message)}
              disabled={!pipelineId || pipelineItems.isPending}
              value={field.value}
              onBlur={field.onBlur}
              onChange={(e) => field.onChange(e.target.value)}
            >
              <NativeSelectOption value="">
                {!pipelineId
                  ? 'Pilih pipeline dulu'
                  : pipelineItems.isPending
                    ? 'Memuat task…'
                    : tasks.length
                      ? 'Pilih task'
                      : 'Pipeline ini belum punya task aktif'}
              </NativeSelectOption>
              {tasks.map((task) => (
                <NativeSelectOption key={task.id} value={task.id}>
                  {task.sort_order}.{' '}
                  {task.item_name ?? task.item?.name ?? items.labelOf(task.item_id)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
        )}
      />
      <ComboboxField
        control={form.control}
        name="worker"
        id="assignment-worker"
        label="Worker"
        lookup="users"
        params={{ role: 'WORKER', status: 'ACTIVE' }}
        placeholder="Pilih worker"
      />
    </FormDialog>
  );
}
