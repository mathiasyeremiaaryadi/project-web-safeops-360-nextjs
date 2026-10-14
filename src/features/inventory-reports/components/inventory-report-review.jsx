'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { getErrorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { useReviewInventoryReport } from '@/features/inventory-reports/api/mutations';
import {
  INVENTORY_REPORT_STATUS,
  INVENTORY_REPORT_STATUS_BADGES,
  NEXT_ACTIONS,
} from '@/features/inventory-reports/lib/constants';

/** @typedef {import('@/features/inventory-reports/lib/constants').ReviewAction} ReviewAction */

/** Actions shown as the primary (filled) button. */
const PRIMARY = new Set([INVENTORY_REPORT_STATUS.APPROVED, INVENTORY_REPORT_STATUS.RESOLVED]);

/**
 * Review buttons allowed from the report's current status (`NEXT_ACTIONS`), each confirmed;
 * "Tolak" needs a reason. Renders nothing when no transition is allowed.
 * @param {object} props
 * @param {{ id: string, status: string }} props.report
 * @param {() => void} [props.onReviewed]
 * @param {string} [props.className]
 */
export function InventoryReportReview({ report, onReviewed, className }) {
  const review = useReviewInventoryReport();
  const [pending, setPending] = useState(/** @type {ReviewAction | null} */ (null));
  const actions = NEXT_ACTIONS[report.status] ?? [];
  if (actions.length === 0) return null;

  /** @param {string} reason */
  const confirm = (reason) => {
    if (!pending) return;
    review.mutate(
      { id: report.id, action: pending, reason },
      {
        onSuccess: () => {
          toast.success(
            `Status laporan: ${INVENTORY_REPORT_STATUS_BADGES[pending.status]?.label ?? pending.status}.`,
          );
          setPending(null);
          onReviewed?.();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {actions.map((action) => (
          <Button
            key={action.status}
            type="button"
            variant={PRIMARY.has(action.status) ? 'default' : 'outline'}
            className={cn(
              'h-11 flex-1 font-semibold',
              !PRIMARY.has(action.status) && 'bg-card',
              action.tone === 'destructive' && 'text-danger hover:text-danger',
            )}
            onClick={() => setPending(action)}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending ? `${pending.label}?` : ''}
        description={pending?.needsReason ? 'Alasan ini dikirim ke pelapor.' : undefined}
        reasonLabel={pending?.needsReason ? 'Alasan' : undefined}
        confirmLabel={pending?.label ?? ''}
        tone={pending?.tone}
        pending={review.isPending}
        onConfirm={confirm}
      />
    </>
  );
}
