import { REPORT_STATUS, REVISION_STATUS } from '@/features/pipeline-reports/lib/constants';

/** Review decisions on a task report. */
export const REVIEW_DECISION = Object.freeze({
  REJECT: 'REJECT',
  REVISION: 'REVISION',
  APPROVE: 'APPROVE',
});

/** UI of each decision, in button order (Tolak · Minta revisi · Setujui). */
export const REVIEW_DECISIONS = Object.freeze([
  {
    decision: REVIEW_DECISION.REJECT,
    label: 'Tolak',
    title: 'Tolak laporan?',
    needsReason: true,
    tone: /** @type {const} */ ('destructive'),
    success: 'Laporan ditolak.',
  },
  {
    decision: REVIEW_DECISION.REVISION,
    label: 'Minta revisi',
    title: 'Minta revisi laporan?',
    needsReason: true,
    tone: /** @type {const} */ ('default'),
    success: 'Revisi diminta ke worker.',
  },
  {
    decision: REVIEW_DECISION.APPROVE,
    label: 'Setujui',
    title: 'Setujui laporan?',
    needsReason: false,
    tone: /** @type {const} */ ('default'),
    success: 'Laporan disetujui.',
  },
]);

/**
 * Body of `PATCH /pipeline-reports/{id}` for a review decision — the ONLY place that knows the
 * field names. `revision_status` and `reason` are assumptions (not in the BRD or Postman):
 * docs/ASSUMPTIONS.md R1.
 * @param {keyof typeof REVIEW_DECISION} decision
 * @param {string} [reason] Required for "Tolak" and "Minta revisi".
 */
export function toReviewPayload(decision, reason = '') {
  const text = reason.trim();
  if (decision === REVIEW_DECISION.APPROVE) return { status: REPORT_STATUS.COMPLETED };
  if (!text) throw new Error('A reason is required to reject or request a revision.');
  if (decision === REVIEW_DECISION.REVISION) {
    return { revision_status: REVISION_STATUS.REQUESTED, reason: text };
  }
  if (decision === REVIEW_DECISION.REJECT) return { status: REPORT_STATUS.REJECTED, reason: text };
  throw new Error(`Unknown review decision: ${decision}`);
}

/**
 * A report can be reviewed while it waits for review: status `SUBMITTED` and no revision
 * pending at the worker (a revision `REQUESTED` waits for the worker to resubmit).
 * @param {{ status: string, revision_status: string }} report
 */
export function canReview(report) {
  return (
    report.status === REPORT_STATUS.SUBMITTED &&
    report.revision_status !== REVISION_STATUS.REQUESTED
  );
}

/**
 * "1 j 25 m" between open and close; `null` when either is missing or close precedes open.
 * @param {string | null | undefined} openedAt
 * @param {string | null | undefined} closedAt
 */
export function formatDuration(openedAt, closedAt) {
  if (!openedAt || !closedAt) return null;
  const minutes = Math.round((Date.parse(closedAt) - Date.parse(openedAt)) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} m`;
  return rest === 0 ? `${hours} j` : `${hours} j ${rest} m`;
}
