import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayBoundaryIso,
  formatLongDate,
  formatTime,
  todayInAppTimezone,
} from '@/lib/date';

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

describe('addDays', () => {
  it('moves across months and years', () => {
    expect(addDays('2026-10-14', -1)).toBe('2026-10-13');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('formatTime', () => {
  it('formats the time in APP_TIMEZONE (Asia/Jakarta, UTC+7)', () => {
    expect(formatTime('2026-10-14T00:42:00Z')).toBe('07.42');
    expect(formatTime(null)).toBe('—');
  });
});
