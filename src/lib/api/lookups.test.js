import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/lib/api/client';
import { fetchLookupOptions } from '@/lib/api/lookups';

vi.mock('@/lib/api/client', () => ({ apiRequest: vi.fn() }));

afterEach(() => vi.mocked(apiRequest).mockReset());

const vendors = {
  data: [
    { id: 'v1', name: 'PT Mitra', site_ids: ['s1', 's2'] },
    { id: 'v2', name: 'PT Karya', site_ids: ['s3'] },
    { id: 'v3', name: 'CV Tanpa Site', site_ids: null },
  ],
};

describe('fetchLookupOptions', () => {
  it('keeps only the vendors of the chosen site, even when the API returns every vendor', async () => {
    vi.mocked(apiRequest).mockResolvedValue(vendors);
    const options = await fetchLookupOptions('vendors', { params: { site_id: 's1' } });
    expect(vi.mocked(apiRequest).mock.calls[0][0].searchParams).toMatchObject({ site_id: 's1' });
    expect(options.map((o) => o.value)).toEqual(['v1', 'v3']);
  });

  it('lists every vendor without a site', async () => {
    vi.mocked(apiRequest).mockResolvedValue(vendors);
    const options = await fetchLookupOptions('vendors');
    expect(options.map((o) => o.value)).toEqual(['v1', 'v2', 'v3']);
  });
});
