import { field, fail, matchesQuery, notFound, now, ok, paginate } from './http.js';

/**
 * Standard master-data routes of the mock (BRD conventions): list with `page/limit/status/q`
 * (+ extra filters), get, create, partial update, and DELETE = soft deactivate.
 *
 * @param {object} options
 * @param {string} options.path e.g. `sites`
 * @param {() => any[]} options.rows
 * @param {string[]} options.searchFields Fields matched by `q`.
 * @param {(row: any, query: URLSearchParams) => boolean} [options.filter] Extra list filters.
 * @param {(body: any) => { row?: any, error?: import('./http.js').MockResponse }} options.create
 * @param {string[]} options.editable Fields a PATCH may change.
 * @param {(row: any) => any} [options.present] Response shape of a row.
 * @param {string} [options.uniqueField] e.g. `code` → 409 on duplicates.
 * @returns {import('./http.js').Route[]}
 */
export function crudRoutes({
  path,
  rows,
  searchFields,
  filter,
  create,
  editable,
  present = (row) => row,
  uniqueField,
}) {
  const find = (/** @type {string} */ id) => rows().find((row) => row.id === id);
  /** @param {string | null | undefined} value @param {string} [exceptId] */
  const isDuplicate = (value, exceptId) =>
    Boolean(uniqueField && value) &&
    rows().some((row) => row[/** @type {string} */ (uniqueField)] === value && row.id !== exceptId);

  return [
    {
      method: 'GET',
      pattern: path,
      handle: (req) => {
        const status = req.query.get('status');
        const list = rows()
          .filter((row) => !status || row.status === status)
          .filter((row) => matchesQuery(row, req.query.get('q'), searchFields))
          .filter((row) => (filter ? filter(row, req.query) : true));
        const page = paginate(list, req.query);
        return ok({ ...page, data: page.data.map(present) });
      },
    },
    {
      method: 'GET',
      pattern: `${path}/:id`,
      handle: (_req, { id }) => {
        const row = find(id);
        return row ? ok(present(row)) : notFound();
      },
    },
    {
      method: 'POST',
      pattern: path,
      handle: (req) => {
        if (uniqueField && isDuplicate(field(req.body, uniqueField))) {
          return fail(409, 'DUPLICATE', 'Kode sudah dipakai.');
        }
        const { row, error } = create(req.body ?? {});
        if (error) return error;
        const created = {
          id: crypto.randomUUID(),
          status: 'ACTIVE',
          created_at: now(),
          updated_at: now(),
          ...row,
        };
        rows().push(created);
        return ok(present(created), 201);
      },
    },
    {
      method: 'PATCH',
      pattern: `${path}/:id`,
      handle: (req, { id }) => {
        const row = find(id);
        if (!row) return notFound();
        if (uniqueField && isDuplicate(field(req.body, uniqueField), id)) {
          return fail(409, 'DUPLICATE', 'Kode sudah dipakai.');
        }
        for (const key of [...editable, 'status']) {
          const value = field(req.body, key);
          if (value !== undefined && value !== null) row[key] = value;
        }
        row.updated_at = now();
        return ok(present(row));
      },
    },
    {
      method: 'DELETE',
      pattern: `${path}/:id`,
      handle: (_req, { id }) => {
        const row = find(id);
        if (!row) return notFound();
        row.status = 'INACTIVE';
        row.updated_at = now();
        return { status: 204 };
      },
    },
  ];
}

/** @param {any} body @param {string[]} names @returns {import('./http.js').MockResponse | null} */
export function requireFields(body, names) {
  const missing = names.find((name) => !String(field(body, name) ?? '').trim());
  return missing ? fail(400, 'VALIDATION_ERROR', `${missing} wajib diisi.`) : null;
}
