import { REPORT_STATUS } from '@/lib/task-reports';

export {
  NOTE_CATEGORY_LABELS,
  REPORT_STATUS,
  REPORT_STATUS_BADGES,
  REVISION_BADGES,
  REVISION_STATUS,
} from '@/lib/task-reports';

/**
 * Status filter of /reports/tasks and the API filter of each. A Worker's report is only
 * `IN_PROGRESS` or `COMPLETED`; there is no manager review.
 */
export const TASK_REPORT_STATUS_FILTERS = Object.freeze([
  { value: '', label: 'Semua status', params: {} },
  {
    value: REPORT_STATUS.IN_PROGRESS,
    label: 'Dikerjakan',
    params: { status: REPORT_STATUS.IN_PROGRESS },
  },
  { value: REPORT_STATUS.COMPLETED, label: 'Selesai', params: { status: REPORT_STATUS.COMPLETED } },
]);
