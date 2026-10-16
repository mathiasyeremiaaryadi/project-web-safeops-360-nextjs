'use client';

import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';
import { ClipboardList, Info, WifiOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { addDays, formatLongDate, formatTime, timezoneLabel, todayInAppTimezone } from '@/lib/date';
import { useOnlineStatus } from '@/features/offline';
import { useStartTask } from '@/features/my-tasks/api/mutations';
import { useMyTasks } from '@/features/my-tasks/api/queries';
import { TaskProgress } from '@/features/my-tasks/components/task-progress';
import { TaskRow } from '@/features/my-tasks/components/task-row';
import { WorkSidePanel } from '@/features/my-tasks/components/work-side-panel';
import { groupByPipeline, shiftOf } from '@/features/my-tasks/lib/tasks';

/**
 * `/tasks` — "Tugas hari ini": the Worker's assigned tasks for a day, grouped per pipeline.
 * "Today" is the site's date (WIB/WITA/WIT) as returned by the server; only today and yesterday
 * can be chosen (yesterday: reports sent late for lack of signal).
 */
export function TasksView() {
  const [dateParam, setDate] = useQueryState('date', parseAsString.withDefault(''));
  const online = useOnlineStatus();
  const todayQuery = useMyTasks('');
  const todayTasks = todayQuery.data?.data ?? [];
  const today = todayTasks[0]?.report_date ?? todayInAppTimezone();
  const yesterday = addDays(today, -1);
  const isYesterday = dateParam === yesterday;
  const date = isYesterday ? yesterday : today;
  const yesterdayQuery = useMyTasks(yesterday, { enabled: isYesterday });
  const query = isYesterday ? yesterdayQuery : todayQuery;
  const tasks = query.data?.data ?? [];
  const shift = shiftOf(tasks);
  // An earlier day needs the shift explicitly: the Worker's shift on that day, else today's.
  const start = useStartTask(
    isYesterday ? yesterday : '',
    shift?.name ?? shiftOf(todayTasks)?.name,
  );
  const zone = tasks[0]?.site_timezone ?? todayTasks[0]?.site_timezone;

  return (
    <>
      <PageHeader
        title="Tugas hari ini"
        description={[
          formatLongDate(date),
          shift?.label,
          zone ? `Waktu ${timezoneLabel(zone)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Ganti tanggal
            <Input
              type="date"
              value={date}
              min={yesterday}
              max={today}
              onChange={(e) => setDate(e.target.value === today ? null : e.target.value)}
              className="h-12 w-44"
            />
          </label>
        }
      />

      {!online && query.data ? (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning"
        >
          <WifiOff aria-hidden="true" className="size-4 shrink-0" />
          Offline · data terakhir diperbarui{' '}
          {formatTime(new Date(query.dataUpdatedAt).toISOString())}. Butuh sinyal untuk memulai
          task.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {tasks.length > 0 ? <TaskProgress tasks={tasks} /> : null}
          <p className="flex items-start gap-2 rounded-xl bg-info-bg px-4 py-3 text-sm text-info">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              Lakukan briefing dan periksa APD sebelum mulai bekerja.{' '}
              <Link href="/policies" className="font-semibold underline">
                Baca SOP
              </Link>
            </span>
          </p>

          {query.isPending ? <ListSkeleton rows={4} /> : null}
          {query.isError && !query.data ? <ErrorState onRetry={() => query.refetch()} /> : null}
          {query.isSuccess && tasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Tidak ada task untuk tanggal ini."
              description="Hubungi admin vendor jika ini keliru."
            />
          ) : null}
          {groupByPipeline(tasks).map((group) => (
            <section
              key={group.key}
              aria-label={group.name ?? 'Pipeline'}
              className="rounded-2xl border bg-card px-4 sm:px-5"
            >
              <header className="border-b py-4">
                <h2 className="font-semibold text-foreground">{group.name ?? 'Pipeline'}</h2>
                <p className="text-sm text-muted-foreground">
                  {[group.vendorName, `${group.tasks.length} task`].filter(Boolean).join(' · ')}
                </p>
              </header>
              <ol className="flex flex-col divide-y">
                {group.tasks.map((task, index) => (
                  <TaskRow
                    key={`${task.pipeline_item_id}-${task.shift ?? ''}`}
                    task={task}
                    position={index + 1}
                    onStart={(t) => start.mutate(t)}
                    startDisabled={start.isPending || !online}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
        <WorkSidePanel />
      </div>
    </>
  );
}
