import { describe, expect, it } from 'vitest';
import { toFormData } from '@/lib/api/form-data';

describe('toFormData', () => {
  it('skips empty fields and stringifies numbers', () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const data = toFormData({ item: 'APAR', qty: 0, note: undefined, image: file, x: null });
    expect(data.get('item')).toBe('APAR');
    expect(data.get('qty')).toBe('0');
    expect(data.has('note')).toBe(false);
    expect(data.has('x')).toBe(false);
    expect(data.get('image')).toBeInstanceOf(File);
  });
});
