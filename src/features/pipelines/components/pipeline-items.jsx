'use client';

import { useState } from 'react';
import { ListChecks, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { getErrorMessage } from '@/lib/api/errors';
import { searchRows } from '@/lib/search';
import { MASTER_STATUS } from '@/lib/constants';
import {
  useAddPipelineItem,
  useRemovePipelineItem,
  useReorderPipelineItems,
  useTogglePipelineItem,
} from '@/features/pipelines/api/mutations';
import { usePipelineItems } from '@/features/pipelines/api/queries';
import { PipelineItemRow } from '@/features/pipelines/components/pipeline-item-row';
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
  const [taskQuery, setTaskQuery] = useState('');

  if (query.isPending) return <ListSkeleton rows={3} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const items = sortItems(query.data.data);
  /** @param {PipelineItem} item */
  const nameOf = (item) => item.item_name ?? item.item?.name ?? itemNames.labelOf(item.item_id);
  const visibleItems = searchRows(items, taskQuery, (item) => [nameOf(item)]);
  // Reordering a filtered list would be ambiguous: ↑/↓ only while not searching.
  const canReorder = !taskQuery.trim();

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

      {items.length > 0 ? (
        <div className="relative mb-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={taskQuery}
            onChange={(event) => setTaskQuery(event.target.value)}
            placeholder="Cari task di pipeline ini"
            aria-label="Cari task di pipeline ini"
            className="pl-11"
          />
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Belum ada task"
          description="Tambahkan task dari master task."
        />
      ) : (
        <ol className="flex flex-col divide-y" aria-label="Urutan task">
          {visibleItems.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              Task tidak ditemukan.
            </li>
          ) : null}
          {visibleItems.map((item) => {
            const index = items.indexOf(item);
            return (
              <PipelineItemRow
                key={item.id}
                item={item}
                name={nameOf(item)}
                position={index + 1}
                canEdit={canEdit}
                canMoveUp={canReorder && index > 0 && !reorder.isPending}
                canMoveDown={canReorder && index < items.length - 1 && !reorder.isPending}
                onMove={(direction) => move(index, direction)}
                onToggle={() => toggle.mutate(item, { onError: showError })}
                onRemove={() => setRemoving(item)}
              />
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
