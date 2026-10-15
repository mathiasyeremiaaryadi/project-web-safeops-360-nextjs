import { describe, expect, it } from 'vitest';
import {
  pipelineDetailSchema,
  pipelineFormSchema,
  pipelineItemListSchema,
  toPipelinePayload,
} from '@/features/pipelines/api/schemas';

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

describe('pipeline form', () => {
  const values = {
    isNew: true,
    site: { value: 's1', label: 'PLTU Paiton' },
    vendor: { value: 'v1', label: 'PT Bersih Jaya' },
    name: 'Cleaning Area Baru',
    description: '',
  };

  it('requires a site only when creating', () => {
    expect(pipelineFormSchema.safeParse({ ...values, site: null }).error?.issues[0]).toMatchObject({
      path: ['site'],
      message: 'Site wajib dipilih.',
    });
    expect(pipelineFormSchema.safeParse({ ...values, isNew: false, site: null }).success).toBe(
      true,
    );
  });

  it('sends site and vendor when creating, never when editing', () => {
    expect(toPipelinePayload(values)).toEqual({
      site_id: 's1',
      vendor_id: 'v1',
      name: 'Cleaning Area Baru',
      description: undefined,
    });
    expect(toPipelinePayload({ ...values, isNew: false })).toEqual({
      name: 'Cleaning Area Baru',
      description: undefined,
    });
  });
});
