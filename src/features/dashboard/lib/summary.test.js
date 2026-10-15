import { describe, expect, it } from 'vitest';
import { toDashboardKpis, toStatusCounts, toProgress } from '@/features/dashboard/lib/summary';

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
  it('returns total (sum of statuses), in progress, pending and completed', () => {
    expect(
      toDashboardKpis({
        data: {
          pipeline_reports: { PENDING: 6, IN_PROGRESS: 4, SUBMITTED: 9, COMPLETED: 29 },
          pipeline_revisions: { REQUESTED: 4 },
        },
      }),
    ).toEqual({ total: 48, inProgress: 4, pending: 6, completed: 29 });
  });

  it('prefers an explicit total and reads a list of counts', () => {
    expect(
      toDashboardKpis({
        pipeline_reports: [
          { status: 'TOTAL', count: 50 },
          { status: 'COMPLETED', count: 10 },
        ],
      }),
    ).toEqual({ total: 50, inProgress: 0, pending: 0, completed: 10 });
  });
});

describe('toProgress', () => {
  it('sums pipeline rows per vendor and computes the percentage', () => {
    const progress = toProgress({
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
        id: 'v1',
        name: 'PT Bersih Jaya',
        tasks: 20,
        completed: 14,
        submitted: 3,
        revision: 1,
        notStarted: 2,
        percent: 70,
      },
      {
        key: 'v2',
        id: 'v2',
        name: 'PT Karya Aman',
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
    const progress = toProgress([
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
    expect(toProgress({ message: 'ok' })).toEqual([]);
    expect(toProgress(null)).toEqual([]);
  });

  it('groups per pipeline for the Admin vendor dashboard', () => {
    const progress = toProgress(
      {
        data: [
          {
            vendor_id: 'v1',
            pipeline_id: 'p1',
            pipeline_name: 'Turbine Hall',
            total_tasks: 10,
            completed: 9,
          },
          {
            vendor_id: 'v1',
            pipeline_id: 'p2',
            pipeline_name: 'Boiler',
            total_tasks: 4,
            completed: 1,
          },
          {
            vendor_id: 'v1',
            pipeline_id: 'p1',
            pipeline_name: 'Turbine Hall',
            total_tasks: 10,
            completed: 5,
          },
        ],
      },
      'pipeline',
    );
    expect(progress.map((p) => [p.name, p.tasks, p.completed, p.percent])).toEqual([
      ['Turbine Hall', 20, 14, 70],
      ['Boiler', 4, 1, 25],
    ]);
  });

  it('counts each nested pipeline of a vendor row when grouping per pipeline', () => {
    const progress = toProgress(
      [
        {
          vendor_id: 'v1',
          pipelines: [
            { id: 'p1', name: 'A', tasks: 2, completed: 2 },
            { id: 'p2', name: 'B', tasks: 4, completed: 1 },
          ],
        },
      ],
      'pipeline',
    );
    expect(progress.map((p) => [p.id, p.name, p.percent])).toEqual([
      ['p1', 'A', 100],
      ['p2', 'B', 25],
    ]);
  });
});
