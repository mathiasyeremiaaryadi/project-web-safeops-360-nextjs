import { addDays } from '@/lib/date';
import { REPORT_STATUS, REVISION_STATUS } from '@/lib/task-reports';

/** Status tabs of "Riwayat laporan": the URL value and the API filter of each. */
export const HISTORY_TABS = Object.freeze([
  { value: '', label: 'Semua', params: {} },
  { value: 'review', label: 'Menunggu review', params: { status: REPORT_STATUS.SUBMITTED } },
  {
    value: 'revision',
    label: 'Revisi diminta',
    params: { revision_status: REVISION_STATUS.REQUESTED },
  },
  { value: 'done', label: 'Selesai', params: { status: REPORT_STATUS.COMPLETED } },
  { value: 'rejected', label: 'Ditolak', params: { status: REPORT_STATUS.REJECTED } },
]);

export const HISTORY_DEFAULT_DAYS = 7;
export const HISTORY_MAX_DAYS = 31;

/**
 * Date range of the history from the URL: the last 7 days by default, at most 31 days.
 * @param {string} fromParam `YYYY-MM-DD` or `''`.
 * @param {string} toParam `YYYY-MM-DD` or `''`.
 * @param {string} today `YYYY-MM-DD` in APP_TIMEZONE.
 * @returns {{ from: string, to: string, error: string | null }}
 */
export function resolveHistoryRange(fromParam, toParam, today) {
  const to = toParam || today;
  const from = fromParam || addDays(to, -(HISTORY_DEFAULT_DAYS - 1));
  if (from > to) return { from, to, error: 'Tanggal mulai harus sebelum tanggal akhir.' };
  if (addDays(from, HISTORY_MAX_DAYS - 1) < to) {
    return { from, to, error: `Rentang maksimal ${HISTORY_MAX_DAYS} hari.` };
  }
  return { from, to, error: null };
}
