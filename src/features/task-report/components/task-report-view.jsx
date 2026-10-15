'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { isNotFound, NotFoundState } from '@/components/shared/not-found-state';
import { formatLongDate, formatTime } from '@/lib/date';
import { REPORT_STATUS } from '@/lib/task-reports';
import { cn } from '@/lib/utils';
import { MAX_UPLOAD_ATTEMPTS, useOnlineStatus } from '@/features/offline';
import { ReportBadges } from '@/features/pipeline-reports';
import {
  useSaveReportNotes,
  useSubmitReport,
  useUploadEvidence,
} from '@/features/task-report/api/mutations';
import { useReportHistory, useWorkerReport } from '@/features/task-report/api/queries';
import { useUploadQueue } from '@/features/task-report/api/upload-queue';
import { EvidenceSlot } from '@/features/task-report/components/evidence-slot';
import { ReportHistory } from '@/features/task-report/components/report-history';
import { SafetyNotes } from '@/features/task-report/components/safety-notes';
import {
  EVIDENCE_FIELD,
  EVIDENCE_TYPES,
  getSubmitBlocker,
  isReportEditable,
  needsRevision,
} from '@/features/task-report/lib/report-state';
import { preloadPhotoCompression } from '@/features/task-report/lib/photo';

/** @typedef {import('@/features/pipeline-reports/api/schemas').TaskReport} TaskReport */

/**
 * `/tasks/report/[reportId]` — the Worker fills in a task report: before/after photos,
 * safety notes, and "Kirim laporan". Read-only while waiting for review or once approved.
 * @param {{ reportId: string }} props
 */
export function TaskReportView({ reportId }) {
  const query = useWorkerReport(reportId);

  if (query.isPending) return <ListSkeleton rows={4} />;
  if (query.isError && isNotFound(query.error)) {
    return (
      <NotFoundState
        description="Laporan ini tidak ada atau bukan milik Anda."
        backHref="/tasks"
        backLabel="Kembali ke tugas"
      />
    );
  }
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return <ReportForm report={query.data} />;
}

/** @param {{ report: TaskReport }} props */
function ReportForm({ report }) {
  const online = useOnlineStatus();
  const history = useReportHistory(report.id);
  const upload = useUploadEvidence(report.id);
  const save = useSaveReportNotes(report.id);
  const submit = useSubmitReport(report.id);
  const queue = useUploadQueue();
  // Photo being uploaded now, per type (shown until the server has it).
  const [uploading, setUploading] = useState(
    /** @type {Partial<Record<'before' | 'after', File>>} */ ({}),
  );
  const [draft, setDraft] = useState(
    /** @type {{ notes: string, category: string } | null} */ (null),
  );

  const editable = isReportEditable(report);
  const saved = { notes: report.note ?? '', category: report.note_category ?? '' };
  const values = draft ?? saved;
  const dirty = values.notes.trim() !== saved.notes.trim() || values.category !== saved.category;
  // Photos of this report queued offline, per type.
  const queued = Object.fromEntries(
    queue.uploads.filter((u) => u.reportId === report.id).map((u) => [u.type, u]),
  );
  const busy = EVIDENCE_TYPES.some((type) => uploading[type]) || save.isPending || submit.isPending;
  const blocker = getSubmitBlocker(report, {
    online,
    busy,
    waiting: { before: Boolean(queued.before), after: Boolean(queued.after) },
  });

  // Opening the report sends its queued photos if there is signal again.
  const { process } = queue;
  useEffect(() => {
    process();
  }, [process]);
  useEffect(() => {
    if (editable) preloadPhotoCompression();
  }, [editable]);

  /** @param {'before' | 'after'} type @param {File} file */
  const takePhoto = (type, file) => {
    setUploading((current) => ({ ...current, [type]: file }));
    upload.mutate(
      { type, file },
      {
        onSettled: () =>
          setUploading((current) =>
            current[type] === file ? { ...current, [type]: undefined } : current,
          ),
      },
    );
  };

  /** @param {'before' | 'after'} type */
  const localState = (type) => {
    if (uploading[type]) return 'uploading';
    if (!queued[type]) return null;
    return queued[type].attempts >= MAX_UPLOAD_ATTEMPTS ? 'failed' : 'waiting';
  };

  const times = { before: report.opened_at, after: report.closed_at };
  const meta = [
    report.pipeline_name,
    report.shift ? `Shift ${report.shift}` : null,
    report.report_date ? formatLongDate(report.report_date.slice(0, 10)) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="md:pb-24 lg:pb-0">
      <PageHeader title={report.task_name ?? 'Laporan task'} description={meta} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <ReportBadges report={report} />
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock aria-hidden="true" className="size-4" />
              Mulai {formatTime(report.opened_at)} · Selesai {formatTime(report.closed_at)}
            </p>
          </div>

          {needsRevision(report) ? (
            <p
              role="status"
              className="flex items-start gap-2 rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {report.reason
                  ? `Revisi diminta: ${report.reason}`
                  : 'Revisi diminta oleh admin vendor.'}
              </span>
            </p>
          ) : null}

          <section
            aria-labelledby="evidence-title"
            className="rounded-2xl border bg-card p-4 sm:p-5"
          >
            <h2 id="evidence-title" className="font-semibold text-foreground">
              Foto evidence
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Wajib 2 foto, sebelum dan sesudah, dari sudut yang sama.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {EVIDENCE_TYPES.map((type) => (
                <EvidenceSlot
                  key={type}
                  type={type}
                  url={report[EVIDENCE_FIELD[type]]}
                  time={report[EVIDENCE_FIELD[type]] ? formatTime(times[type]) : null}
                  preview={uploading[type] ?? queued[type]?.blob ?? null}
                  state={localState(type)}
                  editable={editable}
                  lockedReason={
                    type === 'after' && !report.before_url && !uploading.before && !queued.before
                      ? 'Ambil foto sebelum dulu.'
                      : null
                  }
                  onPick={(file) => takePhoto(type, file)}
                  extra={
                    localState(type) === 'failed' ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 bg-card"
                        onClick={() => queue.retry(queued[type].id)}
                      >
                        Coba lagi
                      </Button>
                    ) : null
                  }
                />
              ))}
            </div>
          </section>

          {history.data?.length ? <ReportHistory entries={history.data} /> : null}
        </div>

        <aside className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
          <SafetyNotes value={values} onChange={setDraft} disabled={!editable || busy} />
          <div
            className={cn(
              'fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:left-[72px]',
              'lg:static lg:border-0 lg:p-0',
            )}
          >
            {editable ? (
              <>
                <div className="flex gap-3 [&>*]:flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 bg-card text-base"
                    disabled={!dirty || busy}
                    onClick={() => save.mutate(values, { onSuccess: () => setDraft(null) })}
                  >
                    {save.isPending ? 'Menyimpan…' : 'Simpan'}
                  </Button>
                  <Button
                    type="button"
                    className="h-12 text-base font-semibold"
                    disabled={Boolean(blocker)}
                    onClick={() => submit.mutate({ notes: dirty ? values : null })}
                  >
                    {submit.isPending ? 'Mengirim…' : 'Kirim laporan'}
                  </Button>
                </div>
                {blocker && !busy ? (
                  <p className="text-center text-xs text-muted-foreground lg:text-left">
                    {blocker}
                  </p>
                ) : null}
              </>
            ) : (
              <p
                role="status"
                className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-foreground lg:justify-start"
              >
                <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
                {report.status === REPORT_STATUS.COMPLETED
                  ? 'Laporan disetujui.'
                  : 'Menunggu review admin vendor.'}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
