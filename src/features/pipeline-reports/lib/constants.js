import { REPORT_STATUS, REVISION_STATUS } from '@/lib/task-reports';

export {
  NOTE_CATEGORY_LABELS,
  REPORT_STATUS,
  REPORT_STATUS_BADGES,
  REVISION_BADGES,
  REVISION_STATUS,
} from '@/lib/task-reports';

/**
 * Status tabs of /reports/tasks and the API filter of each. "Revisi diminta" is a revision
 * status, not a report status (docs/ASSUMPTIONS.md R3).
 */
export const TASK_REPORT_TABS = Object.freeze([
  { value: 'SUBMITTED', label: 'Menunggu review', params: { status: REPORT_STATUS.SUBMITTED } },
  {
    value: 'REVISION',
    label: 'Revisi diminta',
    params: { revision_status: REVISION_STATUS.REQUESTED },
  },
  { value: 'COMPLETED', label: 'Selesai', params: { status: REPORT_STATUS.COMPLETED } },
  { value: 'REJECTED', label: 'Ditolak', params: { status: REPORT_STATUS.REJECTED } },
  { value: 'ALL', label: 'Semua', params: {} },
]);

export const DEFAULT_TASK_REPORT_TAB = 'SUBMITTED';
