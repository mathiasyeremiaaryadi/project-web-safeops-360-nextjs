import { describe, expect, it } from 'vitest';
import {
  toDashboardKpis,
  toStatusCounts,
  toVendorProgress,
} from '@/features/dashboard/lib/summary';

describe('toStatusCounts', () => {
  it('reads a map or a list of { status, count }', () => {
    expect(toStatusCounts({ submitted: 3, COMPLETED: '5' })).toEqual({
      SUBMITTED: 3,
      COMPLETED: 5,
    });
    expect(
      toStatusCounts([
        { status: 'SUBMITTED', count: 2 },
        { status: 'REJECTED', total: 1 },
      ]),
    ).toEqual({
      SUBMITTED: 2,
      REJECTED: 1,
    });
    expect(toStatusCounts(null)).toEqual({});
  });
});

describe('toDashboardKpis', () => {
  it('sums the statuses when no total is sent', () => {
    expect(
      toDashboardKpis({
        data: {
          pipeline_reports: { PENDING: 6, IN_PROGRESS: 4, SUBMITTED: 9, COMPLETED: 29 },
          pipeline_revisions: { REQUESTED: 4 },
        },
      }),
    ).toEqual({ total: 48, completed: 29, submitted: 9, revision: 4, notStarted: 6 });
  });

  it('prefers an explicit total and leaves unknown counts empty', () => {
    expect(toDashboardKpis({ pipeline_reports: { TOTAL: 50, COMPLETED: 10 } })).toEqual({
      total: 50,
      completed: 10,
      submitted: 0,
      revision: null,
      notStarted: null,
    });
  });
});

describe('toVendorProgress', () => {
  it('sums pipeline rows per vendor and computes the percentage', () => {
    const progress = toVendorProgress({
      data: [
        {
          vendor_id: 'v1',
          vendor_name: 'PT Bersih Jaya',
          pipeline_id: 'p1',
          total_tasks: 12,
          completed: 8,
          submitted: 2,
          revision_requested: 1,
        },
        {
          vendor_id: 'v1',
          vendor_name: 'PT Bersih Jaya',
          pipeline_id: 'p2',
          total_tasks: 8,
          completed: 6,
          submitted: 1,
        },
        {
          vendor_id: 'v2',
          vendor_name: 'PT Karya Aman',
          total_tasks: 16,
          completed: 9,
          submitted: 4,
          revision_requested: 2,
          pending: 1,
        },
      ],
    });
    expect(progress).toEqual([
      {
        key: 'v1',
        vendorId: 'v1',
        vendorName: 'PT Bersih Jaya',
        tasks: 20,
        completed: 14,
        submitted: 3,
        revision: 1,
        notStarted: 2,
        percent: 70,
      },
      {
        key: 'v2',
        vendorId: 'v2',
        vendorName: 'PT Karya Aman',
        tasks: 16,
        completed: 9,
        submitted: 4,
        revision: 2,
        notStarted: 1,
        percent: 56,
      },
    ]);
  });

  it('reads nested pipelines and handles a vendor without tasks', () => {
    const progress = toVendorProgress([
      {
        vendor: { id: 'v3', name: 'PT Sinar' },
        pipelines: [
          { tasks: 4, completed: 1 },
          { tasks: 2, completed: 2 },
        ],
      },
      { vendor_id: 'v4', total_tasks: 0 },
    ]);
    expect(progress.map((v) => [v.key, v.tasks, v.completed, v.notStarted, v.percent])).toEqual([
      ['v3', 6, 3, 3, 50],
      ['v4', 0, 0, 0, 0],
    ]);
  });

  it('returns an empty list for an unknown shape', () => {
    expect(toVendorProgress({ message: 'ok' })).toEqual([]);
    expect(toVendorProgress(null)).toEqual([]);
  });
});
