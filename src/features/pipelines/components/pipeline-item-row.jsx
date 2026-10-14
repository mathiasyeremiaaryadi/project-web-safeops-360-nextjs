'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { MASTER_STATUS, MASTER_STATUS_BADGES } from '@/lib/constants';

/**
 * One task of a pipeline: position, name, status and (for editors) the row actions.
 * @param {object} props
 * @param {import('@/features/pipelines/api/schemas').PipelineItem} props.item
 * @param {string} props.name
 * @param {number} props.position 1-based position in the pipeline.
 * @param {boolean} props.canEdit
 * @param {boolean} props.canMoveUp
 * @param {boolean} props.canMoveDown
 * @param {(direction: -1 | 1) => void} props.onMove
 * @param {() => void} props.onToggle
 * @param {() => void} props.onRemove
 */
export function PipelineItemRow({
  item,
  name,
  position,
  canEdit,
  canMoveUp,
  canMoveDown,
  onMove,
  onToggle,
  onRemove,
}) {
  const active = item.status === MASTER_STATUS.ACTIVE;

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
        >
          {position}
        </span>
        <span className="min-w-0 flex-1 font-medium text-foreground">{name}</span>
        <StatusBadge status={MASTER_STATUS_BADGES[item.status]} />
      </div>
      {canEdit ? (
        <div className="flex flex-wrap gap-2 pl-11 sm:pl-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 bg-card"
            aria-label={`Naikkan ${name}`}
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 bg-card"
            aria-label={`Turunkan ${name}`}
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" className="h-10 bg-card" onClick={onToggle}>
            {active ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 bg-card text-danger hover:text-danger"
            onClick={onRemove}
          >
            Lepas dari pipeline
          </Button>
        </div>
      ) : null}
    </li>
  );
}
