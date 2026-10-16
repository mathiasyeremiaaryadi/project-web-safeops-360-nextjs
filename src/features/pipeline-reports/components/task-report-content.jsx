import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate, formatSiteTime } from '@/lib/date';
import { EvidencePhotos } from '@/features/pipeline-reports/components/evidence-photos';
import { RevisionHistory } from '@/features/pipeline-reports/components/revision-history';
import { shiftLabel } from '@/features/pipeline-reports/components/report-badges';
import {
  NOTE_CATEGORY_LABELS,
  REPORT_STATUS_BADGES,
  REVISION_BADGES,
} from '@/features/pipeline-reports/lib/constants';
import { formatDuration } from '@/features/pipeline-reports/lib/review';

/** @param {{ title: string, children: import('react').ReactNode }} props */
function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-2.5 border-t pt-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** @param {{ items: [string, import('react').ReactNode][] }} props */
function Facts({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {items.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Read-only body of a task report: who/when, evidence, times, finding, review reason, history.
 * @param {{ report: import('@/features/pipeline-reports/api/schemas').TaskReport, workerName: string }} props
 */
export function TaskReportContent({ report, workerName }) {
  const duration = formatDuration(report.opened_at, report.closed_at);
  const history = report.history ?? [];
  const zone = report.site_timezone;

  return (
    <div className="flex flex-col gap-4">
      <Facts
        items={[
          ['Worker', workerName],
          ['Site', report.site_name ?? '—'],
          ['Shift', shiftLabel(report.shift)],
          ['Tanggal laporan', formatDate(report.report_date)],
          ['Revisi', report.revision_count ? `${report.revision_count} kali` : 'Tidak ada'],
          ['Dikirim', formatSiteTime(report.submitted_at, zone)],
        ]}
      />

      <Section title="Foto evidence">
        <EvidencePhotos beforeUrl={report.before_url} afterUrl={report.after_url} />
      </Section>

      <RevisionHistory
        reportId={report.id}
        revisionCount={report.revision_count}
        timeZone={zone}
        className="flex flex-col border-t pt-4"
      />

      <Section title="Waktu pengerjaan">
        <Facts
          items={[
            ['Mulai', formatSiteTime(report.opened_at, zone)],
            ['Selesai', formatSiteTime(report.closed_at, zone)],
            ['Durasi', duration ?? '—'],
          ]}
        />
      </Section>

      {report.note_category || report.note ? (
        <Section title="Temuan">
          {report.note_category ? (
            <p className="font-medium text-foreground">
              {NOTE_CATEGORY_LABELS[report.note_category] ?? report.note_category}
            </p>
          ) : null}
          {report.note ? (
            <p className="text-sm whitespace-pre-line text-foreground">{report.note}</p>
          ) : null}
        </Section>
      ) : null}

      {report.reason ? (
        <Section title="Alasan review">
          <p className="text-sm whitespace-pre-line text-foreground">{report.reason}</p>
        </Section>
      ) : null}

      {history.length > 0 ? (
        <Section title="Riwayat status">
          <ol className="flex flex-col gap-2">
            {history.map((entry, index) => (
              <li key={index} className="flex flex-col gap-1 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  {entry.status ? (
                    <StatusBadge
                      status={REPORT_STATUS_BADGES[entry.status]}
                      fallback={entry.status}
                    />
                  ) : null}
                  {entry.revision_status && REVISION_BADGES[entry.revision_status] ? (
                    <StatusBadge status={REVISION_BADGES[entry.revision_status]} />
                  ) : null}
                  <span className="text-muted-foreground">{formatSiteTime(entry.at, zone)}</span>
                </span>
                {entry.reason ? <span className="text-foreground">{entry.reason}</span> : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}
    </div>
  );
}
