import { describe, expect, it } from 'vitest';
import { NEXT_ACTIONS, toInventoryReviewPayload } from '@/features/inventory-reports/lib/constants';
import { inventoryReportListSchema } from '@/features/inventory-reports/api/schemas';

const statusesFrom = (/** @type {string} */ status) =>
  (NEXT_ACTIONS[status] ?? []).map((action) => action.status);

describe('NEXT_ACTIONS', () => {
  it('follows Baru → Diperiksa → Disetujui → Selesai, with Tolak before approval', () => {
    expect(statusesFrom('SUBMITTED')).toEqual(['IN_REVIEW', 'APPROVED', 'REJECTED']);
    expect(statusesFrom('IN_REVIEW')).toEqual(['APPROVED', 'REJECTED']);
    expect(statusesFrom('APPROVED')).toEqual(['RESOLVED']);
  });

  it('has no action from final statuses', () => {
    expect(statusesFrom('REJECTED')).toEqual([]);
    expect(statusesFrom('RESOLVED')).toEqual([]);
  });

  it('only "Tolak" needs a reason', () => {
    const withReason = Object.values(NEXT_ACTIONS)
      .flat()
      .filter((action) => action.needsReason)
      .map((action) => action.status);
    expect([...new Set(withReason)]).toEqual(['REJECTED']);
  });
});

describe('toInventoryReviewPayload', () => {
  const reject = NEXT_ACTIONS.IN_REVIEW.find((a) => a.status === 'REJECTED');
  const approve = NEXT_ACTIONS.IN_REVIEW.find((a) => a.status === 'APPROVED');

  it('sends review_reason only when given', () => {
    expect(toInventoryReviewPayload(approve)).toEqual({ status: 'APPROVED' });
    expect(toInventoryReviewPayload(reject, ' stok cukup ')).toEqual({
      status: 'REJECTED',
      review_reason: 'stok cukup',
    });
  });

  it('refuses "Tolak" without a reason', () => {
    expect(() => toInventoryReviewPayload(reject, '')).toThrow();
  });
});

describe('inventoryReportListSchema', () => {
  it('reads an `inventory_reports` envelope with nested inventory/user', () => {
    const parsed = inventoryReportListSchema.parse({
      inventory_reports: [
        {
          id: 1,
          vendor_id: 2,
          type: 'damaged',
          status: 'in_review',
          inventory: { id: 9, item: 'APAR' },
          user: { full_name: 'Siti' },
          evidence_key: 'inv/1.jpg',
          created_at: '2026-10-14T01:00:00Z',
        },
      ],
    });
    expect(parsed.data[0]).toMatchObject({
      id: '1',
      report_type: 'DAMAGED',
      status: 'IN_REVIEW',
      inventory_id: '9',
      inventory_name: 'APAR',
      reporter_name: 'Siti',
      evidence_url: 'inv/1.jpg',
      reported_at: '2026-10-14T01:00:00Z',
    });
  });
});
