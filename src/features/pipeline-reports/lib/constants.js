/** Task (pipeline) report status (BRD 8.5). */
export const REPORT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
});

export const REPORT_STATUS_BADGES = Object.freeze({
  [REPORT_STATUS.PENDING]: { label: 'Belum dikerjakan', variant: 'neutral' },
  [REPORT_STATUS.IN_PROGRESS]: { label: 'Dikerjakan', variant: 'info' },
  [REPORT_STATUS.SUBMITTED]: { label: 'Menunggu review', variant: 'warning' },
  [REPORT_STATUS.COMPLETED]: { label: 'Selesai', variant: 'success' },
  [REPORT_STATUS.REJECTED]: { label: 'Ditolak', variant: 'danger' },
});

/** Revision status. `NONE` is not shown. */
export const REVISION_STATUS = Object.freeze({
  NONE: 'NONE',
  REQUESTED: 'REQUESTED',
  RESUBMITTED: 'RESUBMITTED',
});

export const REVISION_BADGES = Object.freeze({
  [REVISION_STATUS.REQUESTED]: { label: 'Revisi diminta', variant: 'revision' },
  [REVISION_STATUS.RESUBMITTED]: { label: 'Revisi dikirim', variant: 'info' },
});

/** Safety note category. */
export const NOTE_CATEGORY_LABELS = Object.freeze({
  NEAR_MISS: 'Near miss',
  UNSAFE_ACTION: 'Unsafe action',
  UNSAFE_CONDITION: 'Unsafe condition',
});

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
