import { describe, expect, it } from 'vitest';
import {
  inventoryDetailSchema,
  inventoryFormSchema,
  inventoryListSchema,
  toInventoryFields,
} from '@/features/inventories/api/schemas';

describe('inventory schemas', () => {
  it('reads an `inventories` envelope and normalises condition/status', () => {
    const parsed = inventoryListSchema.parse({
      inventories: [
        { id: 1, vendor_id: 2, item: 'APAR', qty: '3', status_condition: 'good', is_active: true },
      ],
    });
    expect(parsed.data[0]).toMatchObject({
      id: '1',
      vendor_id: '2',
      qty: 3,
      status_condition: 'GOOD',
      status: 'ACTIVE',
    });
  });

  it('unwraps the detail from `inventory`', () => {
    const parsed = inventoryDetailSchema.parse({
      inventory: {
        id: 'a',
        vendor_id: 'v',
        item: 'Helm',
        qty: 1,
        status: 'ACTIVE',
        image_url: 'https://x/y.png',
      },
    });
    expect(parsed.image_url).toBe('https://x/y.png');
  });

  it('accepts qty 0 and rejects negative or decimal quantities', () => {
    const base = {
      vendor: { value: 'v', label: 'V' },
      item: 'A',
      jenis_item: 'B',
      status_condition: 'GOOD',
      image: null,
    };
    expect(inventoryFormSchema.safeParse({ ...base, qty: '0' }).success).toBe(true);
    expect(inventoryFormSchema.safeParse({ ...base, qty: '-1' }).success).toBe(false);
    expect(inventoryFormSchema.safeParse({ ...base, qty: '1.5' }).success).toBe(false);
  });

  it('builds multipart fields without an image when none is chosen', () => {
    const fields = toInventoryFields({
      vendor: { value: 'v', label: 'V' },
      item: 'A',
      jenis_item: 'B',
      qty: '4',
      status_condition: 'DAMAGED',
      image: null,
    });
    expect(fields).toEqual({
      vendor_id: 'v',
      item: 'A',
      jenis_item: 'B',
      qty: 4,
      status_condition: 'DAMAGED',
      image: undefined,
    });
  });
});
