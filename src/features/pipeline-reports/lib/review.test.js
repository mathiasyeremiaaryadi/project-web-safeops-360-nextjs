import { describe, expect, it } from 'vitest';
import {
  canReview,
  formatDuration,
  REVIEW_DECISION,
  toReviewPayload,
} from '@/features/pipeline-reports/lib/review';
import {
  taskReportDetailSchema,
  taskReportListSchema,
} from '@/features/pipeline-reports/api/schemas';

describe('toReviewPayload', () => {
  it('approves without a reason', () => {
    expect(toReviewPayload(REVIEW_DECISION.APPROVE)).toEqual({ status: 'COMPLETED' });
  });

  it('requests a revision with a trimmed reason', () => {
    expect(toReviewPayload(REVIEW_DECISION.REVISION, '  foto buram ')).toEqual({
      revision_status: 'REQUESTED',
      reason: 'foto buram',
    });
  });

  it('rejects with a reason', () => {
    expect(toReviewPayload(REVIEW_DECISION.REJECT, 'bukan area ini')).toEqual({
      status: 'REJECTED',
      reason: 'bukan area ini',
    });
  });

  it.each([REVIEW_DECISION.REJECT, REVIEW_DECISION.REVISION])(
    '%s cannot be sent without a reason',
    (decision) => {
      expect(() => toReviewPayload(decision, '   ')).toThrow();
    },
  );
});

describe('canReview', () => {
  it('allows SUBMITTED reports without a pending revision', () => {
    expect(canReview({ status: 'SUBMITTED', revision_status: 'NONE' })).toBe(true);
    expect(canReview({ status: 'SUBMITTED', revision_status: 'RESUBMITTED' })).toBe(true);
  });

  it('blocks other statuses and a requested revision', () => {
    expect(canReview({ status: 'SUBMITTED', revision_status: 'REQUESTED' })).toBe(false);
    expect(canReview({ status: 'COMPLETED', revision_status: 'NONE' })).toBe(false);
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration('2026-10-14T07:00:00Z', '2026-10-14T08:25:00Z')).toBe('1 j 25 m');
    expect(formatDuration('2026-10-14T07:00:00Z', '2026-10-14T07:40:00Z')).toBe('40 m');
    expect(formatDuration('2026-10-14T07:00:00Z', '2026-10-14T09:00:00Z')).toBe('2 j');
  });

  it('returns null when a time is missing or close precedes open', () => {
    expect(formatDuration(null, '2026-10-14T08:00:00Z')).toBeNull();
    expect(formatDuration('2026-10-14T08:00:00Z', '2026-10-14T07:00:00Z')).toBeNull();
  });
});

describe('task report schemas', () => {
  it('reads nested names, nested detail and a lower-case status', () => {
    const parsed = taskReportListSchema.parse({
      data: [
        {
          id: 7,
          status: 'submitted',
          shift: 1,
          pipeline_item: { item: { name: 'Lap panel' }, pipeline: { name: 'Turbine Hall' } },
          user: { id: 3, full_name: 'Agus' },
          detail: {
            evidence_before: 'reports/a.jpg',
            note_category: 'near_miss',
            note: 'Lantai licin',
          },
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });
    expect(parsed.data[0]).toMatchObject({
      id: '7',
      status: 'SUBMITTED',
      revision_status: 'NONE',
      shift: '1',
      task_name: 'Lap panel',
      pipeline_name: 'Turbine Hall',
      worker_name: 'Agus',
      user_id: '3',
      before_url: 'reports/a.jpg',
      note_category: 'NEAR_MISS',
      note: 'Lantai licin',
    });
  });

  it('unwraps the detail from `pipeline_report`', () => {
    const parsed = taskReportDetailSchema.parse({
      pipeline_report: { id: 'x', status: 'COMPLETED' },
    });
    expect(parsed.id).toBe('x');
  });
});
