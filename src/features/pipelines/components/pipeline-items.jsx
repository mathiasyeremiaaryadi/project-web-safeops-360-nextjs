'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { StatusBadge } from '@/components/shared/status-badge';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { getErrorMessage } from '@/lib/api/errors';
import { MASTER_STATUS, MASTER_STATUS_BADGES } from '@/lib/constants';
import {
  useAddPipelineItem,
  useRemovePipelineItem,
  useReorderPipelineItems,
  useTogglePipelineItem,
} from '@/features/pipelines/api/mutations';
import { usePipelineItems } from '@/features/pipelines/api/queries';
import { nextSortOrder, sortItems, swapWithNeighbour } from '@/features/pipelines/lib/order';

/** @typedef {import('@/features/pipelines/api/schemas').PipelineItem} PipelineItem */

/** @param {unknown} error */
const showError = (error) => toast.error(getErrorMessage(error));

/**
 * Ordered tasks of a pipeline: add (appended last), move ↑/↓, activate/deactivate, detach.
 * @param {{ pipelineId: string, canEdit: boolean }} props
 */
export function PipelineItems({ pipelineId, canEdit }) {
  const query = usePipelineItems(pipelineId);
  const itemNames = useOptionLabels('items');
  const addItem = useAddPipelineItem(pipelineId);
  const reorder = useReorderPipelineItems(pipelineId);
  const toggle = useTogglePipelineItem(pipelineId);
  const remove = useRemovePipelineItem(pipelineId);
  const [removing, setRemoving] = useState(/** @type {PipelineItem | null} */ (null));

  if (query.isPending) return <ListSkeleton rows={3} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const items = sortItems(query.data.data);
  /** @param {PipelineItem} item */
  const nameOf = (item) => item.item_name ?? item.item?.name ?? itemNames.labelOf(item.item_id);

  /** @param {import('@/lib/api/lookups').Option | null} option */
  const add = (option) => {
    if (!option) return;
    addItem.mutate(
      { item_id: option.value, sort_order: nextSortOrder(items) },
      { onSuccess: () => toast.success('Task ditambahkan.'), onError: showError },
    );
  };

  /** @param {number} index @param {-1 | 1} direction */
  const move = (index, direction) => {
    const patches = swapWithNeighbour(items, index, direction);
    if (patches.length) reorder.mutate(patches, { onError: showError });
  };

  return (
    <section aria-labelledby="pipeline-items-title" className="mt-6 border-t pt-5">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="pipeline-items-title" className="text-lg font-semibold text-foreground">
          Task ({items.length})
        </h2>
        {canEdit ? (
          <AsyncCombobox
            className="sm:w-80"
            lookup="items"
            params={{ status: MASTER_STATUS.ACTIVE }}
            value={null}
            onChange={add}
            placeholder={addItem.isPending ? 'Menambahkan…' : 'Tambah task'}
            ariaLabel="Tambah task ke pipeline"
            disabled={addItem.isPending}
          />
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Belum ada task"
          description="Tambahkan task dari master task."
        />
      ) : (
        <ol className="flex flex-col divide-y">
          {items.map((item, index) => {
            const active = item.status === MASTER_STATUS.ACTIVE;
            return (
              <li key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-foreground">{nameOf(item)}</span>
                  <StatusBadge status={MASTER_STATUS_BADGES[item.status]} />
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap gap-2 pl-11 sm:pl-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 bg-card"
                      aria-label={`Naikkan ${nameOf(item)}`}
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 bg-card"
                      aria-label={`Turunkan ${nameOf(item)}`}
                      disabled={index === items.length - 1 || reorder.isPending}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 bg-card"
                      onClick={() => toggle.mutate(item, { onError: showError })}
                    >
                      {active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 bg-card text-danger hover:text-danger"
                      onClick={() => setRemoving(item)}
                    >
                      Lepas dari pipeline
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Lepas task dari pipeline?"
        description={
          removing
            ? `"${nameOf(removing)}" tidak lagi dikerjakan di pipeline ini. Master task-nya tetap ada.`
            : undefined
        }
        confirmLabel="Lepas dari pipeline"
        tone="destructive"
        pending={remove.isPending}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(removing.id, {
            onSuccess: () => {
              toast.success('Task dilepas dari pipeline.');
              setRemoving(null);
            },
            onError: showError,
          });
        }}
      />
    </section>
  );
}
