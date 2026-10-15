import { summarizeTasks } from '@/features/my-tasks/lib/tasks';

/**
 * "{n} dari {total} task selesai" · "{n} menunggu review", with a progress bar.
 * @param {{ tasks: import('@/features/my-tasks/api/schemas').MyTask[] }} props
 */
export function TaskProgress({ tasks }) {
  const summary = summarizeTasks(tasks);
  return (
    <section aria-label="Progres hari ini" className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-semibold text-foreground">
          {summary.completed} dari {summary.total} task selesai
        </p>
        <p className="text-sm text-muted-foreground">{summary.submitted} menunggu review</p>
      </div>
      <div
        role="progressbar"
        aria-label="Task selesai"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={summary.percent}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-success" style={{ width: `${summary.percent}%` }} />
      </div>
    </section>
  );
}
