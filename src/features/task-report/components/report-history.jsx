import { formatDateTime } from '@/lib/date';
import { REPORT_STATUS_BADGES, REVISION_BADGES } from '@/lib/task-reports';

/**
 * "Riwayat status" — only rendered when the server has the history endpoint (⚠ W5).
 * @param {{ entries: { status?: string | null, revision_status?: string | null, reason?: string | null, at?: string | null }[] }} props
 */
export function ReportHistory({ entries }) {
  if (entries.length === 0) return null;
  return (
    <section
      aria-labelledby="report-history-title"
      className="rounded-2xl border bg-card p-4 sm:p-5"
    >
      <h2 id="report-history-title" className="mb-3 font-semibold text-foreground">
        Riwayat status
      </h2>
      <ol className="flex flex-col gap-3">
        {entries.map((entry, index) => {
          const badge =
            REVISION_BADGES[entry.revision_status?.toUpperCase() ?? ''] ??
            REPORT_STATUS_BADGES[entry.status?.toUpperCase() ?? ''];
          return (
            <li key={index} className="border-l-2 pl-3 text-sm">
              <p className="font-medium text-foreground">
                {badge?.label ?? entry.status ?? entry.revision_status ?? '—'}
              </p>
              {entry.at ? (
                <p className="text-muted-foreground">{formatDateTime(entry.at)}</p>
              ) : null}
              {entry.reason ? <p className="text-muted-foreground">{entry.reason}</p> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
