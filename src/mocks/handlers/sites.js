import { crudRoutes, requireFields } from '../go/crud.js';

/**
 * Mock `/sites` (BRD 8.3): code, name, optional site_type, status.
 * @param {{ db: () => import('../go/seed.js').MockDb }} ctx
 */
export function siteRoutes({ db }) {
  return crudRoutes({
    path: 'sites',
    rows: () => db().sites,
    searchFields: ['code', 'name'],
    uniqueField: 'code',
    editable: ['code', 'name', 'site_type'],
    create: (body) => {
      const error = requireFields(body, ['code', 'name']);
      if (error) return { error };
      return { row: { code: body.code, name: body.name, site_type: body.site_type || null } };
    },
  });
}
