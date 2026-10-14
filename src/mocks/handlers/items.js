import { crudRoutes, requireFields } from '../go/crud.js';

/**
 * Mock `/items` — shared master task (BRD 8.4): name, optional description, status.
 * @param {{ db: () => import('../go/seed.js').MockDb }} ctx
 */
export function itemRoutes({ db }) {
  return crudRoutes({
    path: 'items',
    rows: () => db().items,
    searchFields: ['name', 'description'],
    editable: ['name', 'description'],
    create: (body) => {
      const error = requireFields(body, ['name']);
      if (error) return { error };
      return { row: { name: body.name, description: body.description || null } };
    },
  });
}
