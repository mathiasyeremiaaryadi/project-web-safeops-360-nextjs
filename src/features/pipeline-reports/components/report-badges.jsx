import { StatusBadge } from '@/components/shared/status-badge';
import { REPORT_STATUS_BADGES, REVISION_BADGES } from '@/features/pipeline-reports/lib/constants';

/**
 * Status badge + revision badge (only when the revision status is not `NONE`).
 * @param {{ report: { status: string, revision_status: string } }} props
 */
export function ReportBadges({ report }) {
  const revision = REVISION_BADGES[report.revision_status];
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <StatusBadge status={REPORT_STATUS_BADGES[report.status]} fallback={report.status || '—'} />
      {revision ? <StatusBadge status={revision} /> : null}
    </span>
  );
}

/** "Shift 1" for a numeric shift, else the value itself. @param {string | null | undefined} shift */
export function shiftLabel(shift) {
  if (!shift) return '—';
  return /^\d+$/.test(shift) ? `Shift ${shift}` : shift;
}
