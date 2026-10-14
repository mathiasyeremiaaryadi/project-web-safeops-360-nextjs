import { crudRoutes, requireFields } from '../go/crud.js';

/**
 * Mock `/vendors` (BRD 8.3): code, name, site_ids (many-to-many), status. `?site_id=` filter.
 * @param {{ db: () => import('../go/seed.js').MockDb }} ctx
 */
export function vendorRoutes({ db }) {
  return crudRoutes({
    path: 'vendors',
    rows: () => db().vendors,
    searchFields: ['code', 'name'],
    uniqueField: 'code',
    editable: ['code', 'name', 'site_ids'],
    filter: (row, query) => !query.get('site_id') || row.site_ids.includes(query.get('site_id')),
    create: (body) => {
      const error = requireFields(body, ['code', 'name']);
      if (error) return { error };
      return {
        row: {
          code: body.code,
          name: body.name,
          site_ids: Array.isArray(body.site_ids) ? body.site_ids : [],
        },
      };
    },
  });
}
