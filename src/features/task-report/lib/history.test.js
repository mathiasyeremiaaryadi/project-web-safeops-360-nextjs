import { describe, expect, it } from 'vitest';
import { HISTORY_TABS, resolveHistoryRange } from '@/features/task-report/lib/history';

const TODAY = '2026-10-15';

describe('resolveHistoryRange', () => {
  it('defaults to the last 7 days, today included', () => {
    expect(resolveHistoryRange('', '', TODAY)).toEqual({
      from: '2026-10-09',
      to: TODAY,
      error: null,
    });
  });

  it('accepts up to 31 days and rejects longer or reversed ranges', () => {
    expect(resolveHistoryRange('2026-09-15', TODAY, TODAY).error).toBeNull();
    expect(resolveHistoryRange('2026-09-14', TODAY, TODAY).error).toBe('Rentang maksimal 31 hari.');
    expect(resolveHistoryRange('2026-10-16', TODAY, TODAY).error).toBe(
      'Tanggal mulai harus sebelum tanggal akhir.',
    );
  });
});

describe('HISTORY_TABS', () => {
  it('filters "Revisi diminta" on the revision status, the others on the report status', () => {
    expect(HISTORY_TABS.map((tab) => [tab.label, tab.params])).toEqual([
      ['Semua', {}],
      ['Menunggu review', { status: 'SUBMITTED' }],
      ['Revisi diminta', { revision_status: 'REQUESTED' }],
      ['Selesai', { status: 'COMPLETED' }],
      ['Ditolak', { status: 'REJECTED' }],
    ]);
  });
});
