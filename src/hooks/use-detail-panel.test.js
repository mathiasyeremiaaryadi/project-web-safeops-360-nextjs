import { describe, expect, it } from 'vitest';
import { neighbourId } from '@/hooks/use-detail-panel';
import { asImageUrl } from '@/components/shared/signed-image';

describe('neighbourId', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('selects the next row, else the previous one', () => {
    expect(neighbourId(rows, 'a')).toBe('b');
    expect(neighbourId(rows, 'c')).toBe('b');
  });

  it('returns empty when nothing is left or the id is unknown', () => {
    expect(neighbourId([{ id: 'a' }], 'a')).toBe('');
    expect(neighbourId(rows, 'x')).toBe('');
  });
});

describe('asImageUrl', () => {
  it('accepts only http(s) URLs (object keys cannot be displayed)', () => {
    expect(asImageUrl('https://minio/x.jpg?sig=1')).toBe('https://minio/x.jpg?sig=1');
    expect(asImageUrl('reports/x.jpg')).toBeNull();
    expect(asImageUrl('javascript:alert(1)')).toBeNull();
    expect(asImageUrl(null)).toBeNull();
  });
});
