import { describe, expect, it } from 'vitest';
import { myTaskListSchema } from '@/features/my-tasks/api/schemas';
import {
  groupByPipeline,
  shiftOf,
  summarizeTasks,
  TASK_ACTION,
  taskActionOf,
} from '@/features/my-tasks/lib/tasks';

/** @param {Partial<import('@/features/my-tasks/api/schemas').MyTask>} task */
const task = (task) => ({
  pipeline_item_id: 'i',
  task_name: 'Task',
  sort_order: 1,
  pipeline_id: 'p1',
  pipeline_name: 'Turbine',
  vendor_name: 'PT Bersih Jaya',
  shift: 'Pagi',
  shift_start: null,
  shift_end: null,
  report_id: 'r',
  status: 'IN_PROGRESS',
  revision_status: 'NONE',
  revision_reason: null,
  ...task,
});

describe('taskActionOf / TASK_ACTION', () => {
  it.each([
    ['no report yet', { report_id: null, status: 'PENDING' }, 'Mulai', 'primary'],
    ['in progress', { status: 'IN_PROGRESS' }, 'Lanjutkan', 'primary'],
    ['rejected', { status: 'REJECTED' }, 'Perbaiki', 'primary'],
    [
      'revision requested',
      { status: 'SUBMITTED', revision_status: 'REQUESTED' },
      'Perbaiki',
      'primary',
    ],
    ['submitted', { status: 'SUBMITTED' }, 'Lihat', 'outline'],
    ['completed', { status: 'COMPLETED' }, 'Lihat', 'outline'],
  ])('%s → %s', (_case, state, label, variant) => {
    expect(taskActionOf(task(state))).toMatchObject({ label, variant });
  });

  it('has one action per report status', () => {
    expect(Object.keys(TASK_ACTION).sort()).toEqual([
      'COMPLETED',
      'IN_PROGRESS',
      'PENDING',
      'REJECTED',
      'SUBMITTED',
    ]);
  });
});

describe('summarizeTasks', () => {
  it('counts completed and waiting tasks (a requested revision is not waiting)', () => {
    const tasks = [
      task({ status: 'COMPLETED' }),
      task({ status: 'SUBMITTED' }),
      task({ status: 'IN_PROGRESS' }),
      task({ status: 'SUBMITTED', revision_status: 'REQUESTED' }),
      task({ report_id: null, status: 'PENDING' }),
    ];
    expect(summarizeTasks(tasks)).toEqual({ total: 5, completed: 1, submitted: 1, percent: 20 });
    expect(summarizeTasks([])).toEqual({ total: 0, completed: 0, submitted: 0, percent: 0 });
  });
});

describe('groupByPipeline / shiftOf', () => {
  it('groups per pipeline in order of appearance and sorts by sort_order', () => {
    const groups = groupByPipeline([
      task({ pipeline_item_id: 'b', sort_order: 2 }),
      task({ pipeline_item_id: 'x', pipeline_id: 'p2', pipeline_name: 'Boiler' }),
      task({ pipeline_item_id: 'a', sort_order: 1 }),
    ]);
    expect(groups.map((g) => [g.name, g.tasks.map((t) => t.pipeline_item_id)])).toEqual([
      ['Turbine', ['a', 'b']],
      ['Boiler', ['x']],
    ]);
  });

  it('shows the shift hours only when the API sends them', () => {
    expect(shiftOf([task({ shift_start: '07:00:00', shift_end: '15:00:00' })])?.label).toBe(
      'Shift Pagi (07.00–15.00)',
    );
    expect(shiftOf([task({})])?.label).toBe('Shift Pagi');
    expect(shiftOf([])).toBeNull();
  });
});

describe('myTaskListSchema', () => {
  it('reads nested assignments, and a task without a report as PENDING', () => {
    const { data } = myTaskListSchema.parse({
      data: [
        {
          shift: { name: 'Pagi', start_time: '07:00' },
          pipeline_item: {
            id: 5,
            sort_order: 2,
            item: { name: 'Lap panel' },
            pipeline: { id: 'p1', name: 'Turbine', vendor: { name: 'PT Bersih Jaya' } },
          },
          report: { id: 'r9', status: 'rejected', revision_status: 'REQUESTED', reason: 'Buram' },
        },
        { pipeline_item_id: 6, item_name: 'Sapu lantai', shift: 'Pagi' },
      ],
    });
    expect(data[0]).toMatchObject({
      pipeline_item_id: '5',
      task_name: 'Lap panel',
      pipeline_name: 'Turbine',
      vendor_name: 'PT Bersih Jaya',
      shift: 'Pagi',
      report_id: 'r9',
      status: 'REJECTED',
      revision_reason: 'Buram',
    });
    expect(data[1].report_id ?? null).toBeNull();
    expect(data[1]).toMatchObject({ status: 'PENDING', revision_status: 'NONE' });
  });
});
