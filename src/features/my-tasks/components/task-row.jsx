'use client';

import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { REPORT_STATUS_BADGES, REVISION_BADGES, REVISION_STATUS } from '@/lib/task-reports';
import { reportHref } from '@/features/my-tasks/api/mutations';
import { taskActionOf } from '@/features/my-tasks/lib/tasks';

/** 48px touch target for the Worker's main actions. */
const ACTION_CLASS = 'h-12 min-w-28 px-5 text-base font-semibold';

/**
 * One assigned task: number, name, status (+ revision and its reason), and one action.
 * @param {object} props
 * @param {import('@/features/my-tasks/api/schemas').MyTask} props.task
 * @param {number} props.position
 * @param {(task: import('@/features/my-tasks/api/schemas').MyTask) => void} props.onStart
 * @param {boolean} props.startDisabled "Mulai" is blocked (request running, or offline).
 */
export function TaskRow({ task, position, onStart, startDisabled }) {
  const action = taskActionOf(task);
  const revision = REVISION_BADGES[task.revision_status];
  const name = task.task_name ?? 'Task';

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
        >
          {position}
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-semibold text-foreground">{name}</span>
          <span className="flex flex-wrap gap-1.5">
            <StatusBadge status={REPORT_STATUS_BADGES[task.report_id ? task.status : 'PENDING']} />
            {revision ? <StatusBadge status={revision} /> : null}
          </span>
          {task.revision_status === REVISION_STATUS.REQUESTED && task.revision_reason ? (
            <p className="text-sm text-danger">Alasan: {task.revision_reason}</p>
          ) : null}
        </div>
      </div>
      {action.key === 'START' ? (
        <Button
          type="button"
          className={ACTION_CLASS}
          disabled={startDisabled}
          aria-label={`Mulai ${name}`}
          onClick={() => onStart(task)}
        >
          {action.label}
        </Button>
      ) : (
        <Link
          href={reportHref(/** @type {string} */ (task.report_id))}
          aria-label={`${action.label} ${name}`}
          className={buttonVariants({
            variant: action.variant === 'primary' ? 'default' : 'outline',
            className: `${ACTION_CLASS} ${action.variant === 'primary' ? '' : 'bg-card'}`,
          })}
        >
          {action.label}
        </Link>
      )}
    </li>
  );
}
