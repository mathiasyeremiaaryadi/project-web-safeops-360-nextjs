import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { listResponseSchema, masterStatusSchema } from '@/lib/api/lists';
import { siteSchema } from '@/features/sites/api/schemas';
import { vendorSchema } from '@/features/vendors/api/schemas';

const list = listResponseSchema(z.object({ id: z.coerce.string() }));

describe('listResponseSchema (tolerant to the Go list envelope)', () => {
  it.each([
    ['documented', { data: [{ id: 1 }], page: 2, limit: 10, total: 11 }],
    ['plain array', [{ id: 1 }]],
    ['nested items', { data: { items: [{ id: 1 }], total: 11 } }],
    [
      'items + meta',
      { items: [{ id: 1 }], meta: { current_page: 2, per_page: 10, total_items: 11 } },
    ],
  ])('reads a %s response', (_label, body) => {
    const parsed = list.parse(body);
    expect(parsed.data).toEqual([{ id: '1' }]);
    expect(parsed.page).toBeGreaterThanOrEqual(1);
  });

  it('keeps paging from meta/pagination', () => {
    expect(list.parse({ data: [], pagination: { page: 3, limit: 5, total: 12 } })).toEqual({
      data: [],
      page: 3,
      limit: 5,
      total: 12,
    });
  });
});

describe('real Go envelopes: sites / vendors', () => {
  const site = {
    id: 'f9bcc857-1a49-4583-9d14-fc5ecb9cc315',
    code: 'INDRAMAYU',
    name: 'PLTU Indramayu',
    site_type: 'PLTU',
    status: 'ACTIVE',
  };
  const vendor = {
    id: '24082e7c-f4db-4632-948e-af636b496754',
    code: 'VND-003',
    name: 'CV Sinergi Perkasa',
    status: 'ACTIVE',
    site_ids: ['045a528e-18e9-4789-84dd-41470821c592'],
  };

  it.each([
    ['top-level', { sites: [site], page: 1, limit: 20, total: 1 }],
    ['inside data', { data: { sites: [site], page: 1, limit: 20, total: 1 } }],
  ])('reads sites (%s)', (_label, body) => {
    const parsed = listResponseSchema(siteSchema).parse(body);
    expect(parsed.data).toEqual([site]);
    expect(parsed.total).toBe(1);
  });

  it.each([
    ['top-level', { vendors: [vendor], page: 1, limit: 20, total: 1 }],
    ['inside data', { data: { vendors: [vendor], page: 1, limit: 20, total: 1 } }],
  ])('reads vendors (%s)', (_label, body) => {
    expect(listResponseSchema(vendorSchema).parse(body).data[0].site_ids).toEqual(vendor.site_ids);
  });
});

describe('master data rows', () => {
  it('accepts lowercase status and numeric ids', () => {
    expect(masterStatusSchema.parse('active')).toBe('ACTIVE');
    expect(
      siteSchema.parse({ id: 7, code: 'PTN', name: 'PLTU Paiton', status: 'inactive' }),
    ).toMatchObject({
      id: '7',
      status: 'INACTIVE',
    });
  });

  it('derives status from is_active', () => {
    expect(siteSchema.parse({ id: 1, code: 'X', name: 'X', is_active: false }).status).toBe(
      'INACTIVE',
    );
  });

  it('reads vendor sites from site_ids or sites[]', () => {
    const base = { id: 1, code: 'BJ', name: 'PT Bersih Jaya', status: 'ACTIVE' };
    expect(vendorSchema.parse({ ...base, site_ids: ['s1'] }).site_ids).toEqual(['s1']);
    expect(
      vendorSchema.parse({ ...base, sites: [{ id: 5, name: 'PLTU Paiton' }] }).site_ids,
    ).toEqual(['5']);
    expect(vendorSchema.parse(base).site_ids).toEqual([]);
  });
});
