import { describe, expect, it } from 'vitest';
import {
  assignmentFormSchema,
  assignmentListSchema,
  toAssignmentPayload,
} from '@/features/assignments/api/schemas';

describe('assignmentListSchema', () => {
  it('reads flat and nested names', () => {
    const { data } = assignmentListSchema.parse({
      data: [
        {
          id: 'a1',
          user_id: 'w1',
          user_full_name: 'Agus Pratama',
          pipeline_item_id: 'pi1',
          item_name: 'Sapu lantai',
          pipeline_name: 'Cleaning Turbine Hall',
          is_active: true,
        },
        {
          id: 'a2',
          user: { id: 'w2', username: 'sinta' },
          pipeline_item: { id: 'pi2', item: { name: 'Lap panel' }, pipeline: { id: 'p1' } },
          is_active: false,
        },
      ],
    });
    expect(data[0]).toMatchObject({ worker_name: 'Agus Pratama', task_name: 'Sapu lantai' });
    expect(data[1]).toMatchObject({
      user_id: 'w2',
      worker_name: 'sinta',
      pipeline_item_id: 'pi2',
      task_name: 'Lap panel',
      pipeline_id: 'p1',
      is_active: false,
    });
  });
});

describe('assignment form', () => {
  it('requires pipeline, task and worker, and sends the Postman body', () => {
    const empty = assignmentFormSchema.safeParse({
      pipeline: null,
      pipeline_item_id: '',
      worker: null,
    });
    expect(empty.error?.issues.map((i) => i.path[0])).toEqual([
      'pipeline',
      'pipeline_item_id',
      'worker',
    ]);
    expect(
      toAssignmentPayload({
        pipeline: { value: 'p1', label: 'P' },
        pipeline_item_id: 'pi1',
        worker: { value: 'w1', label: 'Agus' },
      }),
    ).toEqual({ pipeline_item_id: 'pi1', user_id: 'w1' });
  });
});
