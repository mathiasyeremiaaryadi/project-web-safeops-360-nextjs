/** Inventory report status (BRD 8.5). */
export const INVENTORY_REPORT_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
});

const S = INVENTORY_REPORT_STATUS;

export const INVENTORY_REPORT_STATUS_BADGES = Object.freeze({
  [S.SUBMITTED]: { label: 'Baru', variant: 'info' },
  [S.IN_REVIEW]: { label: 'Diperiksa', variant: 'warning' },
  [S.APPROVED]: { label: 'Disetujui', variant: 'success' },
  [S.REJECTED]: { label: 'Ditolak', variant: 'danger' },
  [S.RESOLVED]: { label: 'Selesai', variant: 'dark' },
});

/** Report type. */
export const INVENTORY_REPORT_TYPE_LABELS = Object.freeze({
  REQUEST: 'Permintaan',
  DAMAGED: 'Kerusakan',
});

export const INVENTORY_REPORT_TABS = Object.freeze([
  { value: '', label: 'Semua' },
  ...Object.entries(INVENTORY_REPORT_STATUS_BADGES).map(([value, badge]) => ({
    value,
    label: badge.label,
  })),
]);

export const TYPE_FILTERS = Object.freeze([
  { value: '', label: 'Semua jenis' },
  ...Object.entries(INVENTORY_REPORT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
]);

/**
 * @typedef {object} ReviewAction
 * @property {string} status Status sent to `PATCH /inventory-reports/{id}/review`.
 * @property {string} label Button label.
 * @property {boolean} needsReason "Tolak" requires `review_reason`.
 * @property {'default' | 'destructive'} tone
 */

/** @type {ReviewAction} */
const APPROVE = { status: S.APPROVED, label: 'Setujui', needsReason: false, tone: 'default' };
/** @type {ReviewAction} */
const REJECT = { status: S.REJECTED, label: 'Tolak', needsReason: true, tone: 'destructive' };

/**
 * Review actions allowed from each status. No action from REJECTED or RESOLVED.
 * @type {Readonly<Record<string, readonly ReviewAction[]>>}
 */
export const NEXT_ACTIONS = Object.freeze({
  [S.SUBMITTED]: [
    { status: S.IN_REVIEW, label: 'Tandai sedang diperiksa', needsReason: false, tone: 'default' },
    APPROVE,
    REJECT,
  ],
  [S.IN_REVIEW]: [APPROVE, REJECT],
  [S.APPROVED]: [
    { status: S.RESOLVED, label: 'Tandai selesai', needsReason: false, tone: 'default' },
  ],
});

/**
 * Body of `PATCH /inventory-reports/{id}/review`.
 * @param {ReviewAction} action
 * @param {string} [reason]
 */
export function toInventoryReviewPayload(action, reason = '') {
  const text = reason.trim();
  if (action.needsReason && !text) throw new Error('A reason is required to reject a report.');
  return text ? { status: action.status, review_reason: text } : { status: action.status };
}
