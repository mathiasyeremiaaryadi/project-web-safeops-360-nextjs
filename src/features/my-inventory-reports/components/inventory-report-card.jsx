import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/date';
import {
  INVENTORY_REPORT_STATUS,
  INVENTORY_REPORT_STATUS_BADGES,
  INVENTORY_REPORT_TYPE_LABELS,
} from '@/features/inventory-reports';

/** @typedef {import('@/features/inventory-reports/api/schemas').InventoryReport} InventoryReport */

/**
 * One of the worker's inventory reports: type, status, item, date — and the reason if rejected.
 * @param {{ report: InventoryReport }} props
 */
export function InventoryReportCard({ report }) {
  const type =
    INVENTORY_REPORT_TYPE_LABELS[
      /** @type {keyof typeof INVENTORY_REPORT_TYPE_LABELS} */ (report.report_type)
    ] ?? report.report_type;
  return (
    <article className="flex flex-col gap-1.5 rounded-xl border bg-card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{type || 'Laporan'}</span>
        <StatusBadge
          status={INVENTORY_REPORT_STATUS_BADGES[report.status]}
          fallback={report.status || '—'}
        />
      </div>
      <p className="truncate text-sm text-foreground">
        {report.inventory_name ?? report.description ?? '—'}
      </p>
      {report.reported_at ? (
        <p className="text-xs text-muted-foreground">{formatDate(report.reported_at)}</p>
      ) : null}
      {report.status === INVENTORY_REPORT_STATUS.REJECTED && report.review_reason ? (
        <p className="rounded-lg bg-danger-bg px-2.5 py-1.5 text-xs text-danger">
          Ditolak: {report.review_reason}
        </p>
      ) : null}
    </article>
  );
}
