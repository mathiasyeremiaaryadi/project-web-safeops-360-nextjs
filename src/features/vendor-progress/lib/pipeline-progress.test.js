import { describe, expect, it } from 'vitest';
import {
  mergePipelineProgress,
  toPipelineProgress,
} from '@/features/vendor-progress/lib/pipeline-progress';

/** Postman fields of `/reports/daily`, one row per pipeline. */
const day = {
  data: [
    {
      pipeline_id: 'p1',
      pipeline_name: 'Cleaning Turbine Hall',
      site_name: 'PLTU Paiton',
      task_count: 10,
      report_count: 8,
      completed_count: 6,
      in_progress_count: 2,
      late_upload_count: 1,
    },
  ],
};

describe('toPipelineProgress', () => {
  it('reads the Postman fields; tasks without a report have not started', () => {
    expect(toPipelineProgress(day)).toEqual([
      {
        key: 'p1',
        pipelineId: 'p1',
        pipelineName: 'Cleaning Turbine Hall',
        siteId: null,
        siteName: 'PLTU Paiton',
        total: 10,
        reports: 8,
        completed: 6,
        inProgress: 2,
        lateUpload: 1,
        notStarted: 2,
        percent: 60,
      },
    ]);
  });

  it('reads vendor rows with nested pipelines and older field names', () => {
    const rows = toPipelineProgress({
      data: [
        {
          vendor_id: 'v1',
          pipelines: [{ pipeline_id: 'p2', total_tasks: 4, completed: 1, submitted: 2 }],
        },
      ],
    });
    expect(rows[0]).toMatchObject({ key: 'p2', total: 4, reports: 3, notStarted: 1, percent: 25 });
    expect(toPipelineProgress(null)).toEqual([]);
  });
});

describe('mergePipelineProgress', () => {
  it('adds the days up per pipeline', () => {
    const [row] = mergePipelineProgress([toPipelineProgress(day), toPipelineProgress(day)]);
    expect(row).toMatchObject({ total: 20, completed: 12, lateUpload: 2, notStarted: 4 });
    expect(row.percent).toBe(60);
  });
});
