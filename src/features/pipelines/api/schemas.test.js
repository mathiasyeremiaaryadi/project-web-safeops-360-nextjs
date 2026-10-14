import { describe, expect, it } from 'vitest';
import { pipelineDetailSchema, pipelineItemListSchema } from '@/features/pipelines/api/schemas';

const pipeline = { id: 'p1', vendor_id: 'v1', name: 'Cleaning Turbine', status: 'ACTIVE' };

describe('pipeline detail (tolerant to the Go wrapper)', () => {
  it.each([
    ['bare', pipeline],
    ['{ pipeline }', { pipeline }],
    ['{ data }', { data: pipeline }],
    ['{ data: { pipeline } }', { data: { pipeline } }],
  ])('reads a %s response', (_label, body) => {
    expect(pipelineDetailSchema.parse(body)).toMatchObject({ id: 'p1', name: 'Cleaning Turbine' });
  });
});

describe('pipeline items', () => {
  it('reads a named envelope, string sort_order and an embedded task', () => {
    const parsed = pipelineItemListSchema.parse({
      pipeline_items: [
        { id: 9, sort_order: '2', status: 'active', item: { id: 'i1', name: 'Sapu' } },
      ],
    });
    expect(parsed.data[0]).toMatchObject({
      id: '9',
      item_id: 'i1',
      sort_order: 2,
      status: 'ACTIVE',
    });
  });
});
