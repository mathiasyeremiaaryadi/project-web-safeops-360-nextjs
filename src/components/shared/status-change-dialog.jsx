'use client';

import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { MASTER_STATUS } from '@/lib/constants';
import { toastApiError } from '@/lib/notify';

/**
 * Confirmation to deactivate (soft delete) or reactivate a master-data row, which then runs the
 * status mutation and reports the result.
 *
 * @example
 * const changeStatus = useChangeSiteStatus();
 * const [toggling, setToggling] = useState(null);
 * <StatusChangeDialog target={toggling} entityLabel="site" mutation={changeStatus}
 *   onClose={() => setToggling(null)} />
 *
 * @param {object} props
 * @param {{ id: string, status: string, name?: string } | null} props.target Row to change;
 *   `null` closes the dialog.
 * @param {string} [props.name] Shown name, when the row has no `name` (e.g. inventory `item`).
 * @param {string} props.entityLabel e.g. "site", "vendor".
 * @param {import('@tanstack/react-query').UseMutationResult<unknown, unknown, any>} props.mutation
 *   A `useMasterStatusChange` mutation.
 * @param {() => void} props.onClose
 */
export function StatusChangeDialog({ target, name, entityLabel, mutation, onClose }) {
  const deactivate = target?.status === MASTER_STATUS.ACTIVE;
  const shownName = name ?? target?.name;

  const confirm = () => {
    if (!target) return;
    mutation.mutate(target, {
      onSuccess: () => {
        toast.success(`Status ${entityLabel} berhasil diubah.`);
        onClose();
      },
      onError: toastApiError,
    });
  };

  return (
    <ConfirmDialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={deactivate ? `Nonaktifkan ${entityLabel}?` : `Aktifkan ${entityLabel}?`}
      description={
        deactivate
          ? `${shownName} tidak bisa dipilih untuk data baru. Data lama tetap tersimpan dan bisa diaktifkan lagi.`
          : `${shownName} bisa dipakai lagi.`
      }
      confirmLabel={deactivate ? 'Nonaktifkan' : 'Aktifkan'}
      tone={deactivate ? 'destructive' : 'default'}
      pending={mutation.isPending}
      onConfirm={confirm}
    />
  );
}
