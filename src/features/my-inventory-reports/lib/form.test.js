import { describe, expect, it } from 'vitest';
import { withOwnVendor } from '@/features/auth';
import {
  inventoryReportFormSchema,
  toInventoryReportFields,
} from '@/features/my-inventory-reports/lib/form';

const values = (fields = {}) => ({
  report_type: 'REQUEST',
  inventory_id: '',
  description: 'Sarung tangan habis',
  ...fields,
});

describe('inventoryReportFormSchema', () => {
  it('requires the inventory for a damage report only', () => {
    expect(inventoryReportFormSchema.safeParse(values()).success).toBe(true);
    const damaged = inventoryReportFormSchema.safeParse(values({ report_type: 'DAMAGED' }));
    expect(damaged.success).toBe(false);
    expect(damaged.error?.issues[0]).toMatchObject({
      path: ['inventory_id'],
      message: 'Pilih inventory yang rusak.',
    });
    expect(
      inventoryReportFormSchema.safeParse(values({ report_type: 'DAMAGED', inventory_id: '7' }))
        .success,
    ).toBe(true);
  });

  it('requires the type and a description', () => {
    const result = inventoryReportFormSchema.safeParse(
      values({ report_type: undefined, description: '  ' }),
    );
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      'description',
      'report_type',
    ]);
  });
});

describe('toInventoryReportFields', () => {
  it('always carries the own vendor and skips an empty inventory', () => {
    expect(withOwnVendor(toInventoryReportFields(values()), 'v1')).toEqual({
      report_type: 'REQUEST',
      inventory_id: undefined,
      description: 'Sarung tangan habis',
      vendor_id: 'v1',
    });
  });
});
