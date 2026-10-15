import { describe, expect, it } from 'vitest';
import { countByCategory, toSafetyNotes } from '@/features/dashboard/lib/safety';

const row = (overrides) => ({
  site_name: 'PLTU Cirebon',
  vendor_name: 'PT Bumi Jaya Konstruksi',
  worker_name: 'Bayu Kusuma',
  category_name: 'Boiler Area',
  area_name: 'Tangga Boiler',
  note_category: 'UNSAFE_CONDITION',
  notes: 'Railing tangga longgar',
  open_date: '2026-10-15T16:30:00+07:00',
  closed_date: '2026-10-15T17:00:00+07:00',
  shift: 'EVENING',
  ...overrides,
});

describe('toSafetyNotes', () => {
  it('maps `data.safety_reports`, newest first', () => {
    const notes = toSafetyNotes({
      data: {
        safety_reports: [
          row({ shift: 'NIGHT', open_date: '2026-10-15T00:30:00+07:00', closed_date: null }),
          row({}),
        ],
      },
    });
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({
      category: 'UNSAFE_CONDITION',
      notes: 'Railing tangga longgar',
      site: 'PLTU Cirebon',
      vendor: 'PT Bumi Jaya Konstruksi',
      worker: 'Bayu Kusuma',
      area: 'Boiler Area › Tangga Boiler',
      shift: 'EVENING',
    });
    expect(notes[1]).toMatchObject({ shift: 'NIGHT', closedAt: null });
  });

  it('tolerates a missing list and drops empty rows', () => {
    expect(toSafetyNotes({ data: { safety_reports: null } })).toEqual([]);
    expect(toSafetyNotes(undefined)).toEqual([]);
    expect(toSafetyNotes({ safety_reports: [row({ notes: '', note_category: null })] })).toEqual(
      [],
    );
  });
});

describe('countByCategory', () => {
  it('counts per category', () => {
    const notes = toSafetyNotes({
      safety_reports: [row({}), row({ note_category: 'near_miss' }), row({})],
    });
    expect(countByCategory(notes)).toEqual({ UNSAFE_CONDITION: 2, NEAR_MISS: 1 });
  });
});
