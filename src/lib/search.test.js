import { describe, expect, it } from 'vitest';
import { compareValues, filterRows, searchRows } from '@/lib/search';
import { nextSort } from '@/components/shared/data-table';

const sites = [
  { code: 'INDRAMAYU', name: 'PLTU Indramayu', type: 'PLTU' },
  { code: 'LABUAN', name: 'PLTU Labuan', type: null },
];

describe('searchRows', () => {
  it('matches any field, case-insensitive', () => {
    const fields = (/** @type {any} */ s) => [s.code, s.name, s.type];
    expect(searchRows(sites, 'labu', fields).map((s) => s.code)).toEqual(['LABUAN']);
    expect(searchRows(sites, '  pltu ', fields)).toHaveLength(2);
    expect(searchRows(sites, '', fields)).toBe(sites);
    expect(searchRows(sites, 'tidak ada', fields)).toEqual([]);
  });
});

describe('compareValues', () => {
  it('sorts text naturally and case-insensitively, numbers numerically, empties last', () => {
    expect(['VND-10', 'vnd-2', 'VND-1'].sort(compareValues)).toEqual(['VND-1', 'vnd-2', 'VND-10']);
    expect([10, 2, 33].sort(compareValues)).toEqual([2, 10, 33]);
    expect(['b', null, 'a', ''].sort(compareValues)).toEqual(['a', 'b', null, '']);
  });
});

describe('nextSort', () => {
  it('cycles ascending → descending → off, and restarts on another column', () => {
    const asc = nextSort(null, 'name');
    expect(asc).toEqual({ id: 'name', desc: false });
    const desc = nextSort(asc, 'name');
    expect(desc).toEqual({ id: 'name', desc: true });
    expect(nextSort(desc, 'name')).toBeNull();
    expect(nextSort(desc, 'code')).toEqual({ id: 'code', desc: false });
  });
});

describe('filterRows', () => {
  const rows = [
    { id: 'a', status: 'SUBMITTED', vendor_id: 'v1' },
    { id: 'b', status: 'COMPLETED', vendor_id: 'v2' },
    { id: 'c', status: 'SUBMITTED' },
  ];
  const ids = (list) => list.map((row) => row.id);

  it('keeps rows matching every non-empty filter', () => {
    expect(ids(filterRows(rows, { status: 'SUBMITTED', vendor_id: 'v1' }))).toEqual(['a', 'c']);
    expect(ids(filterRows(rows, { status: 'COMPLETED' }))).toEqual(['b']);
  });

  it('ignores empty filters and fields the rows do not have', () => {
    expect(ids(filterRows(rows, { status: '', vendor_id: undefined }))).toEqual(['a', 'b', 'c']);
    expect(ids(filterRows(rows, { site_id: 's1' }))).toEqual(['a', 'b', 'c']);
  });
});
