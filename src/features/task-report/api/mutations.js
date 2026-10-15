'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { useSession } from '@/features/auth';
import { myTaskKeys } from '@/features/my-tasks';
import { enqueueUpload } from '@/features/offline';
import { taskReportKeys } from '@/features/pipeline-reports';
import {
  saveReportNotes,
  submitReport,
  uploadEvidence,
} from '@/features/task-report/api/report-api';
import { uploadQueueKey } from '@/features/task-report/api/upload-queue';
import { compressPhoto, PhotoError } from '@/features/task-report/lib/photo';

/** Messages of the Worker report errors (prompt section 4). */
const APPROVED_MESSAGE = 'Laporan sudah disetujui dan tidak bisa diubah.';
const UPLOAD_UNSUPPORTED = 'Unggah foto belum didukung server. Hubungi admin.';
const REPORT_ERRORS = { 403: APPROVED_MESSAGE };
const UPLOAD_ERRORS = {
  ...REPORT_ERRORS,
  405: UPLOAD_UNSUPPORTED,
  // Postman: REPORT_UPLOAD_CLOSED after the same shift starts the next day.
  409: 'Waktu unggah foto untuk laporan ini sudah ditutup.',
};
const SUBMIT_ERRORS = { ...REPORT_ERRORS, 422: 'Foto sebelum dan sesudah wajib ada.' };

/**
 * Reloads the report (and its history) and the task list. Returned from `onSuccess`, so the
 * mutation stays pending until the new data is there.
 */
function useRefreshReport() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: taskReportKeys.all }),
      queryClient.invalidateQueries({ queryKey: myTaskKeys.all }),
    ]);
}

/**
 * @param {unknown} error
 * @param {Partial<Record<number, string>>} overrides
 * @param {() => Promise<unknown>} refresh
 */
function showError(error, overrides, refresh) {
  if (error instanceof PhotoError) return toast.error(error.message);
  toast.error(getErrorMessage(error, overrides));
  // 403: approved in the meantime — reload so the page becomes read-only.
  if (/** @type {any} */ (error)?.status === 403) refresh();
}

/**
 * Takes a photo: compress (EXIF removed), then `uploadEvidence` (⚠ W3). Without signal the
 * compressed photo is queued on the device and sent later (features/offline).
 * @param {string} reportId
 */
export function useUploadEvidence(reportId) {
  const { user } = useSession();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const refresh = useRefreshReport();
  return useMutation({
    /** @param {{ type: 'before' | 'after', file: File }} input */
    mutationFn: async ({ type, file }) => {
      const photo = await compressPhoto(file, type);
      try {
        await uploadEvidence({ reportId, type, file: photo });
        return { queued: false };
      } catch (error) {
        if (!(error instanceof ApiError) || !error.isNetworkError) throw error;
        await enqueueUpload({ userId, reportId, type, blob: photo });
        return { queued: true };
      }
    },
    // Runs while offline too: a network failure is what queues the photo.
    networkMode: 'always',
    onSuccess: async ({ queued }) => {
      if (!queued) return refresh();
      await queryClient.invalidateQueries({ queryKey: uploadQueueKey(userId) });
      toast.info('Foto disimpan di perangkat dan akan dikirim saat online.');
    },
    onError: (error) => showError(error, UPLOAD_ERRORS, refresh),
  });
}

/** "Simpan": notes + safety category. @param {string} reportId */
export function useSaveReportNotes(reportId) {
  const refresh = useRefreshReport();
  return useMutation({
    /** @param {{ notes: string, category: string }} input */
    mutationFn: (input) => saveReportNotes({ reportId, ...input }),
    // Offline it fails with a message instead of waiting and saving later by surprise.
    networkMode: 'always',
    onSuccess: async () => {
      await refresh();
      toast.success('Catatan disimpan.');
    },
    onError: (error) => showError(error, REPORT_ERRORS, refresh),
  });
}

/**
 * "Kirim laporan": saves unsaved notes first, then submits (⚠ W4) — one after the other — and
 * goes back to the task list.
 * @param {string} reportId
 */
export function useSubmitReport(reportId) {
  const router = useRouter();
  const refresh = useRefreshReport();
  return useMutation({
    /** @param {{ notes?: { notes: string, category: string } | null, closedAt?: string | null }} input */
    mutationFn: async ({ notes, closedAt }) => {
      if (notes) await saveReportNotes({ reportId, ...notes });
      await submitReport({ reportId, closedAt });
    },
    networkMode: 'always',
    onSuccess: () => {
      toast.success('Laporan terkirim.');
      router.push('/tasks');
      refresh();
    },
    onError: (error) => showError(error, SUBMIT_ERRORS, refresh),
  });
}
