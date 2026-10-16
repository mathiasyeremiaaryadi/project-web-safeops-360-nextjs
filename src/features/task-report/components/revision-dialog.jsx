'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog } from '@/components/shared/form-dialog';
import { FormField } from '@/components/shared/form-field';
import { useReviseReport } from '@/features/task-report/api/mutations';
import { EvidenceSlot } from '@/features/task-report/components/evidence-slot';
import { EVIDENCE_TYPES } from '@/features/task-report/lib/report-state';

/** @typedef {{ file: File, takenAt: string }} RevisionPhoto */

/**
 * "Ajukan revisi" of a completed report: new before and after photos (both required, taken
 * now) and an optional reason. The current photos are kept in the revision history.
 * @param {{ reportId: string, open: boolean, onClose: () => void }} props
 */
export function RevisionDialog({ reportId, open, onClose }) {
  const revise = useReviseReport(reportId);
  const [photos, setPhotos] = useState(
    /** @type {Partial<Record<'before' | 'after', RevisionPhoto>>} */ ({}),
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const close = () => {
    setPhotos({});
    setReason('');
    setError(null);
    revise.reset();
    onClose();
  };

  /** @param {import('react').FormEvent} event */
  const onSubmit = (event) => {
    event.preventDefault();
    if (!photos.before || !photos.after) {
      setError('Ambil foto sebelum dan sesudah yang baru.');
      return;
    }
    setError(null);
    revise.mutate({ before: photos.before, after: photos.after, reason }, { onSuccess: close });
  };

  return (
    <FormDialog
      open={open}
      onClose={close}
      title="Ajukan revisi"
      description="Ambil ulang foto sebelum dan sesudah dari sudut yang sama. Foto lama tetap tersimpan di riwayat revisi."
      onSubmit={onSubmit}
      pending={revise.isPending}
      error={error}
      submitLabel={revise.isPending ? 'Mengirim…' : 'Kirim revisi'}
    >
      <div className="grid grid-cols-2 gap-3">
        {EVIDENCE_TYPES.map((type) => (
          <EvidenceSlot
            key={type}
            type={type}
            url={null}
            preview={photos[type]?.file ?? null}
            state={revise.isPending ? 'uploading' : null}
            editable={!revise.isPending}
            lockedReason={type === 'after' && !photos.before ? 'Ambil foto sebelum dulu.' : null}
            onPick={(file) =>
              setPhotos((current) => ({
                ...current,
                [type]: { file, takenAt: new Date().toISOString() },
              }))
            }
          />
        ))}
      </div>
      <FormField id="revision-reason" label="Alasan revisi (opsional)">
        <Textarea
          id="revision-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Contoh: foto sebelumnya buram"
          className="text-base"
          maxLength={500}
        />
      </FormField>
    </FormDialog>
  );
}
