import { describe, expect, it } from 'vitest';
import { dayBoundaryIso, formatLongDate, todayInAppTimezone } from '@/lib/date';

describe('date helpers (APP_TIMEZONE = Asia/Jakarta)', () => {
  it('computes "today" in Jakarta, not UTC', () => {
    expect(todayInAppTimezone(new Date('2026-10-13T18:30:00Z'))).toBe('2026-10-14');
  });

  it('gives day boundaries as UTC instants', () => {
    expect(dayBoundaryIso('2026-10-14', 'start')).toBe('2026-10-13T17:00:00.000Z');
    expect(dayBoundaryIso('2026-10-14', 'end')).toBe('2026-10-14T16:59:59.999Z');
    expect(dayBoundaryIso('', 'start')).toBeUndefined();
  });

  it('formats long Indonesian dates', () => {
    expect(formatLongDate('2026-10-14')).toBe('Rabu, 14 Okt 2026');
  });
});
