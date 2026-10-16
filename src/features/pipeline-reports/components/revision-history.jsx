'use client';

import { History } from 'lucide-react';
import { formatSiteTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { useReportRevisions } from '@/features/pipeline-reports/api/queries';
import { EvidencePhotos } from '@/features/pipeline-reports/components/evidence-photos';

/** "Laporan awal" for version 0, else "Revisi ke-n". @param {number} no */
export const revisionLabel = (no) => (no === 0 ? 'Laporan awal' : `Revisi ke-${no}`);

/**
 * "Riwayat revisi": the earlier versions of a report, newest first — their photos and times, and
 * who replaced each one, when and why. Hidden when the report was never revised.
 * @param {{ reportId: string, revisionCount: number, timeZone?: string | null, className?: string }} props
 *   `className` replaces the card frame (e.g. inside another card).
 */
export function RevisionHistory({ reportId, revisionCount, timeZone, className }) {
  const query = useReportRevisions(reportId, { enabled: revisionCount > 0 });
  const revisions = [...(query.data ?? [])].reverse();
  if (revisionCount === 0) return null;

  return (
    <section
      aria-labelledby="revision-history-title"
      className={cn(className ?? 'rounded-2xl border bg-card p-4 sm:p-5')}
    >
      <h2
        id="revision-history-title"
        className="mb-1 flex items-center gap-2 font-semibold text-foreground"
      >
        <History aria-hidden="true" className="size-4" />
        Riwayat revisi
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Foto di atas adalah revisi ke-{revisionCount}. Versi sebelumnya:
      </p>
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Memuat riwayat revisi…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Riwayat revisi tidak bisa dimuat.</p>
      ) : (
        <ol className="flex flex-col gap-5">
          {revisions.map((revision) => (
            <li
              key={revision.id}
              className="flex flex-col gap-2 border-t pt-4 first:border-0 first:pt-0"
            >
              <p className="font-medium text-foreground">{revisionLabel(revision.revision_no)}</p>
              <p className="text-sm text-muted-foreground">
                Mulai {formatSiteTime(revision.opened_at, timeZone, { dateless: true })} · Selesai{' '}
                {formatSiteTime(revision.closed_at, timeZone, { dateless: true })}
              </p>
              <EvidencePhotos beforeUrl={revision.before_url} afterUrl={revision.after_url} />
              <p className="text-sm text-muted-foreground">
                Diganti {formatSiteTime(revision.replaced_at, timeZone)}
                {revision.revised_by ? ` oleh ${revision.revised_by}` : ''}
                {revision.reason ? ` · Alasan: ${revision.reason}` : ''}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
