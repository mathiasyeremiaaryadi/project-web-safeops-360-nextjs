import { REPORT_STATUS, REVISION_STATUS } from '@/lib/task-reports';

/** @typedef {import('@/features/my-tasks/api/schemas').MyTask} MyTask */

/**
 * The one action button of a task row, by the state of its report (mockup "Tugas hari ini").
 * `primary` = filled button, `outline` = secondary.
 */
export const TASK_ACTION = Object.freeze({
  [REPORT_STATUS.PENDING]: { key: 'START', label: 'Mulai', variant: 'primary' },
  [REPORT_STATUS.IN_PROGRESS]: { key: 'CONTINUE', label: 'Lanjutkan', variant: 'primary' },
  [REPORT_STATUS.REJECTED]: { key: 'FIX', label: 'Perbaiki', variant: 'primary' },
  [REPORT_STATUS.SUBMITTED]: { key: 'VIEW', label: 'Lihat', variant: 'outline' },
  [REPORT_STATUS.COMPLETED]: { key: 'VIEW', label: 'Lihat', variant: 'outline' },
});

/**
 * Action of a task: a requested revision is fixed like a rejection; a task without a report
 * (or with an unknown status) is started.
 * @param {MyTask} task
 */
export function taskActionOf(task) {
  if (task.revision_status === REVISION_STATUS.REQUESTED) return TASK_ACTION.REJECTED;
  if (!task.report_id) return TASK_ACTION.PENDING;
  return TASK_ACTION[task.status] ?? TASK_ACTION.IN_PROGRESS;
}

/**
 * Progress card: "{completed} dari {total} task selesai", "{submitted} menunggu review".
 * @param {MyTask[]} tasks
 */
export function summarizeTasks(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === REPORT_STATUS.COMPLETED).length;
  const submitted = tasks.filter(
    (t) => t.status === REPORT_STATUS.SUBMITTED && t.revision_status !== REVISION_STATUS.REQUESTED,
  ).length;
  return {
    total,
    completed,
    submitted,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Tasks grouped per pipeline (in the order the pipelines first appear), each sorted by
 * `sort_order`.
 * @param {MyTask[]} tasks
 */
export function groupByPipeline(tasks) {
  /** @type {Map<string, { key: string, name: string | null, vendorName: string | null, tasks: MyTask[] }>} */
  const groups = new Map();
  for (const task of tasks) {
    const key = task.pipeline_id ?? task.pipeline_name ?? '';
    if (!groups.has(key)) {
      groups.set(key, { key, name: task.pipeline_name, vendorName: task.vendor_name, tasks: [] });
    }
    groups.get(key)?.tasks.push(task);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    tasks: [...group.tasks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }));
}

/**
 * "Pagi (07.00–15.00)" — the shift of the day's assignments, with its hours when the API sends
 * them (the app never invents shift names or hours).
 * @param {MyTask[]} tasks
 */
export function shiftOf(tasks) {
  const first = tasks.find((task) => task.shift);
  if (!first?.shift) return null;
  const hours =
    first.shift_start && first.shift_end
      ? ` (${toHour(first.shift_start)}–${toHour(first.shift_end)})`
      : '';
  return { name: first.shift, label: `Shift ${first.shift}${hours}` };
}

/** "07:00:00" / "07:00" → "07.00". @param {string} time */
function toHour(time) {
  const match = /(\d{1,2}):(\d{2})/.exec(time);
  return match ? `${match[1].padStart(2, '0')}.${match[2]}` : time;
}
