'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { toastApiError } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { useReviewTaskReport } from '@/features/pipeline-reports/api/mutations';
import { REVIEW_DECISIONS } from '@/features/pipeline-reports/lib/review';

/** @typedef {(typeof REVIEW_DECISIONS)[number]} Decision */

/**
 * "Tolak" · "Minta revisi" · "Setujui". Each asks for confirmation; the first two need a reason.
 * @param {object} props
 * @param {string} props.reportId
 * @param {() => void} props.onReviewed Called after a successful decision.
 * @param {string} [props.className] Wrapper classes (e.g. StickyActionBar children layout).
 */
export function TaskReportReview({ reportId, onReviewed, className }) {
  const review = useReviewTaskReport();
  const [pending, setPending] = useState(/** @type {Decision | null} */ (null));

  /** @param {string} reason */
  const confirm = (reason) => {
    if (!pending) return;
    review.mutate(
      { id: reportId, decision: pending.decision, reason },
      {
        onSuccess: () => {
          toast.success(pending.success);
          setPending(null);
          onReviewed();
        },
        onError: toastApiError,
      },
    );
  };

  return (
    <>
      <div className={cn('flex gap-2', className)}>
        {REVIEW_DECISIONS.map((item) => (
          <Button
            key={item.decision}
            type="button"
            variant={item.decision === 'APPROVE' ? 'default' : 'outline'}
            className={cn(
              'h-11 flex-1 font-semibold',
              item.decision !== 'APPROVE' && 'bg-card',
              item.decision === 'REJECT' && 'text-danger hover:text-danger',
            )}
            onClick={() => setPending(item)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending?.title ?? ''}
        description={
          pending?.needsReason ? 'Alasan ini dikirim ke worker dan tercatat di riwayat.' : undefined
        }
        reasonLabel={pending?.needsReason ? 'Alasan' : undefined}
        confirmLabel={pending?.label ?? ''}
        tone={pending?.tone}
        pending={review.isPending}
        onConfirm={confirm}
      />
    </>
  );
}
