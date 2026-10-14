'use client';

import Link from 'next/link';
import { ExternalLink, SearchX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { StickyActionBar } from '@/components/layout/sticky-action-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { SignedImage } from '@/components/shared/signed-image';
import { StatusBadge } from '@/components/shared/status-badge';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { can } from '@/lib/auth/permissions';
import { formatDateTime } from '@/lib/date';
import { useSession } from '@/features/auth';
import { useInventoryReport } from '@/features/inventory-reports/api/queries';
import { InventoryReportReview } from '@/features/inventory-reports/components/inventory-report-review';
import { LinkedInventory } from '@/features/inventory-reports/components/linked-inventory';
import {
  INVENTORY_REPORT_STATUS_BADGES,
  INVENTORY_REPORT_TYPE_LABELS,
  NEXT_ACTIONS,
} from '@/features/inventory-reports/lib/constants';

const LIST_HREF = '/reports/inventory';

/** @param {{ label: string, children: import('react').ReactNode }} props */
function Fact({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words text-foreground">{children}</dd>
    </div>
  );
}

/**
 * An inventory report with the review actions of its status. `page` = /reports/inventory/[id];
 * `panel` = the 2XL side panel of the list.
 * @param {{ id: string, variant: 'page' | 'panel', onReviewed?: () => void }} props
 */
export function InventoryReportDetail({ id, variant, onReviewed }) {
  const query = useInventoryReport(id);
  const { user } = useSession();
  const users = useOptionLabels('users');
  const vendors = useOptionLabels('vendors');

  if (query.isPending) return <ListSkeleton rows={3} />;
  if (query.isError && /** @type {any} */ (query.error).status === 404) {
    return (
      <EmptyState
        icon={SearchX}
        title="Laporan tidak ditemukan"
        description="Laporan ini tidak ada atau di luar akses Anda."
        action={
          variant === 'page' ? (
            <Link
              href={LIST_HREF}
              className={buttonVariants({ variant: 'outline', className: 'h-11 bg-card' })}
            >
              Kembali ke daftar laporan
            </Link>
          ) : null
        }
      />
    );
  }
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const report = query.data;
  const type = INVENTORY_REPORT_TYPE_LABELS[report.report_type] ?? report.report_type;
  const title = `${type || 'Laporan'} · ${report.inventory_name ?? vendors.labelOf(report.vendor_id)}`;
  const canAct =
    can(user, 'INVENTORY_REPORT_REVIEW') && (NEXT_ACTIONS[report.status]?.length ?? 0) > 0;
  // Page: stay on the detail to continue the flow (Baru → Diperiksa → Disetujui → Selesai).
  const review = canAct ? <InventoryReportReview report={report} onReviewed={onReviewed} /> : null;

  return (
    <>
      {variant === 'page' ? <PageHeader title={title} /> : null}
      <article
        className={variant === 'page' ? 'rounded-2xl border bg-card p-5 sm:p-6 md:max-w-3xl' : ''}
      >
        <header className="mb-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h2
              className={
                variant === 'page' ? 'text-xl font-semibold md:sr-only' : 'text-lg font-semibold'
              }
            >
              {title}
            </h2>
            {variant === 'panel' ? (
              <Link
                href={`${LIST_HREF}/${report.id}`}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Buka halaman
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </Link>
            ) : null}
          </div>
          <StatusBadge
            status={INVENTORY_REPORT_STATUS_BADGES[report.status]}
            fallback={report.status || '—'}
          />
        </header>

        <div className="flex flex-col gap-4">
          {report.evidence_url ? (
            <SignedImage
              url={report.evidence_url}
              alt="Foto evidence"
              placeholder="Foto belum tersedia"
              className="aspect-[4/3] w-full max-w-md"
            />
          ) : null}
          {report.description ? (
            <p className="whitespace-pre-line text-foreground">{report.description}</p>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Fact label="Jenis">{type || '—'}</Fact>
            <Fact label="Vendor">{vendors.labelOf(report.vendor_id)}</Fact>
            <Fact label="Pelapor">{report.reporter_name ?? users.labelOf(report.user_id)}</Fact>
            <Fact label="Waktu">{formatDateTime(report.reported_at)}</Fact>
          </dl>
          {report.inventory_id ? (
            <section className="flex flex-col gap-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Inventory terkait</h3>
              <LinkedInventory
                inventoryId={report.inventory_id}
                fallbackName={report.inventory_name}
              />
            </section>
          ) : null}
          {report.review_reason ? (
            <section className="flex flex-col gap-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Alasan review</h3>
              <p className="text-sm whitespace-pre-line text-foreground">{report.review_reason}</p>
            </section>
          ) : null}
        </div>

        {review && variant === 'panel' ? <div className="mt-5 border-t pt-4">{review}</div> : null}
      </article>
      {review && variant === 'page' ? (
        <StickyActionBar className="md:max-w-3xl">{review}</StickyActionBar>
      ) : null}
    </>
  );
}
