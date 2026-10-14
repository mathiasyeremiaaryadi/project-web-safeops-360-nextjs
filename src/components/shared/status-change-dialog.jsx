'use client';

import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { MASTER_STATUS } from '@/lib/constants';

/**
 * Confirmation to deactivate (soft delete) or reactivate a master-data row.
 * @param {object} props
 * @param {{ name: string, status: string } | null} props.target `null` closes the dialog.
 * @param {string} props.entityLabel e.g. "site", "vendor".
 * @param {boolean} props.pending
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onClose
 */
export function StatusChangeDialog({ target, entityLabel, pending, onConfirm, onClose }) {
  const deactivate = target?.status === MASTER_STATUS.ACTIVE;
  return (
    <ConfirmDialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={deactivate ? `Nonaktifkan ${entityLabel}?` : `Aktifkan ${entityLabel}?`}
      description={
        deactivate
          ? `${target?.name} tidak bisa dipilih untuk data baru. Data lama tetap tersimpan dan bisa diaktifkan lagi.`
          : `${target?.name} bisa dipakai lagi.`
      }
      confirmLabel={deactivate ? 'Nonaktifkan' : 'Aktifkan'}
      tone={deactivate ? 'destructive' : 'default'}
      pending={pending}
      onConfirm={onConfirm}
    />
  );
}
