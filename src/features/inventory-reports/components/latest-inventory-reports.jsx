'use client';

import Link from 'next/link';
import { PackageCheck } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { StatusBadge } from '@/components/shared/status-badge';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { formatDateTime } from '@/lib/date';
import { useInventoryReports } from '@/features/inventory-reports/api/queries';
import {
  INVENTORY_REPORT_STATUS,
  INVENTORY_REPORT_STATUS_BADGES,
  INVENTORY_REPORT_TYPE_LABELS,
} from '@/features/inventory-reports/lib/constants';

const LIMIT = 5;

/**
 * "Laporan inventory terbaru" on the dashboard: the 5 newest reports that still need action
 * (Baru or Diperiksa). The API filters one status at a time, so both are fetched and merged.
 * @param {{ siteId: string, vendorId: string }} props
 */
export function LatestInventoryReports({ siteId, vendorId }) {
  const filters = { page: 1, limit: LIMIT, site_id: siteId, vendor_id: vendorId };
  const submitted = useInventoryReports({ ...filters, status: INVENTORY_REPORT_STATUS.SUBMITTED });
  const inReview = useInventoryReports({ ...filters, status: INVENTORY_REPORT_STATUS.IN_REVIEW });
  const users = useOptionLabels('users');
  const vendors = useOptionLabels('vendors');

  const pending = submitted.isPending || inReview.isPending;
  const error = submitted.isError || inReview.isError;
  const rows = [...(submitted.data?.data ?? []), ...(inReview.data?.data ?? [])]
    .sort((a, b) => String(b.reported_at ?? '').localeCompare(String(a.reported_at ?? '')))
    .slice(0, LIMIT);

  return (
    <section aria-labelledby="latest-inventory-title" className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="latest-inventory-title" className="text-lg font-semibold text-foreground">
          Laporan inventory terbaru
        </h2>
        <Link
          href="/reports/inventory"
          className="shrink-0 text-sm font-medium whitespace-nowrap text-primary hover:underline"
        >
          Lihat semua
        </Link>
      </div>

      {pending ? <ListSkeleton rows={3} /> : null}
      {!pending && error ? (
        <ErrorState
          onRetry={() => {
            submitted.refetch();
            inReview.refetch();
          }}
        />
      ) : null}
      {!pending && !error && rows.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Tidak ada laporan baru"
          description="Semua laporan inventory sudah ditangani."
        />
      ) : null}
      {!pending && !error && rows.length > 0 ? (
        <ul className="flex flex-col divide-y">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/reports/inventory/${r.id}`}
                className="flex flex-col gap-1 rounded py-3 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">
                    {INVENTORY_REPORT_TYPE_LABELS[r.report_type] ?? r.report_type}
                  </span>
                  <StatusBadge
                    status={INVENTORY_REPORT_STATUS_BADGES[r.status]}
                    fallback={r.status}
                  />
                </span>
                <span className="font-semibold text-foreground">
                  {r.inventory_name ?? r.description ?? 'Laporan inventory'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {vendors.labelOf(r.vendor_id)} · {r.reporter_name ?? users.labelOf(r.user_id)} ·{' '}
                  {formatDateTime(r.reported_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
