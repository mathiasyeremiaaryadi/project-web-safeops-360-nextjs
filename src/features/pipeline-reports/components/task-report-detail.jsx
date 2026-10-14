'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, SearchX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { StickyActionBar } from '@/components/layout/sticky-action-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { can } from '@/lib/auth/permissions';
import { useSession } from '@/features/auth';
import { useTaskReport } from '@/features/pipeline-reports/api/queries';
import { ReportBadges } from '@/features/pipeline-reports/components/report-badges';
import { TaskReportContent } from '@/features/pipeline-reports/components/task-report-content';
import { TaskReportReview } from '@/features/pipeline-reports/components/task-report-review';
import { canReview } from '@/features/pipeline-reports/lib/review';

const LIST_HREF = '/reports/tasks';

/**
 * A task report with the review decisions. `page` = /reports/tasks/[id] (sticky action bar on
 * mobile, back to the list after a decision); `panel` = the 2XL side panel of the list.
 * @param {object} props
 * @param {string} props.id
 * @param {'page' | 'panel'} props.variant
 * @param {() => void} [props.onReviewed] Panel: select the next report.
 */
export function TaskReportDetail({ id, variant, onReviewed }) {
  const router = useRouter();
  const query = useTaskReport(id);
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
  const title = report.task_name ?? 'Laporan task';
  const subtitle = [
    report.pipeline_name,
    report.vendor_id ? vendors.labelOf(report.vendor_id) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const reviewable = can(user, 'PIPELINE_REPORT_REVIEW') && canReview(report);
  const review = reviewable ? (
    <TaskReportReview
      reportId={report.id}
      onReviewed={variant === 'page' ? () => router.push(LIST_HREF) : (onReviewed ?? (() => {}))}
    />
  ) : null;

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
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          <ReportBadges report={report} />
        </header>

        <TaskReportContent
          report={report}
          workerName={report.worker_name ?? users.labelOf(report.user_id)}
        />

        {review && variant === 'panel' ? <div className="mt-5 border-t pt-4">{review}</div> : null}
      </article>
      {review && variant === 'page' ? (
        <StickyActionBar className="md:max-w-3xl">{review}</StickyActionBar>
      ) : null}
    </>
  );
}
