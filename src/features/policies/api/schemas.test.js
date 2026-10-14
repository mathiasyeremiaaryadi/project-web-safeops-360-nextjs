import { describe, expect, it } from 'vitest';
import {
  policyFileSchema,
  policyFormSchema,
  policyListSchema,
  toPolicyFields,
} from '@/features/policies/api/schemas';

describe('policy schemas', () => {
  it('reads a `policies` envelope with `size` and `created_at` fallbacks', () => {
    const parsed = policyListSchema.parse({
      policies: [
        {
          id: 1,
          vendor_id: 2,
          name: 'SOP',
          status: 'active',
          size: 2048,
          created_at: '2026-10-01T00:00:00Z',
        },
      ],
    });
    expect(parsed.data[0]).toMatchObject({
      file_size: 2048,
      updated_at: '2026-10-01T00:00:00Z',
      status: 'ACTIVE',
    });
  });

  it.each([
    ['https://s3/x.pdf?sig=1'],
    [{ url: 'https://s3/x.pdf?sig=1' }],
    [{ signed_url: 'https://s3/x.pdf?sig=1' }],
    [{ data: { file_url: 'https://s3/x.pdf?sig=1' } }],
  ])('finds the signed URL in %j', (body) => {
    expect(policyFileSchema.parse(body)).toBe('https://s3/x.pdf?sig=1');
  });

  it('rejects a non-http URL', () => {
    expect(policyFileSchema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('requires the PDF only when uploading', () => {
    const values = { vendor: { value: 'v', label: 'V' }, name: 'SOP', file: null };
    expect(policyFormSchema(true).safeParse(values).success).toBe(false);
    expect(policyFormSchema(false).safeParse(values).success).toBe(true);
  });

  it('sends the vendor only when creating', () => {
    const values = { vendor: { value: 'v', label: 'V' }, name: 'SOP', file: null };
    expect(toPolicyFields(values, false)).toEqual({
      vendor_id: undefined,
      name: 'SOP',
      file: undefined,
    });
    expect(toPolicyFields(values, true).vendor_id).toBe('v');
  });
});
