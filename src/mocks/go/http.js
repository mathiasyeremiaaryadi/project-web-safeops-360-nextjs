/*
 * Tiny response helpers and router for the mock Go backend (framework-free).
 *
 * @typedef {object} MockRequest
 * @property {string} method
 * @property {string} path Path after `/api/v1/`, without query string (e.g. `users/42`).
 * @property {URLSearchParams} query
 * @property {(name: string) => string | null} header
 * @property {any} body Parsed JSON, a FormData (multipart) or `null`.
 *
 * @typedef {object} MockResponse
 * @property {number} status
 * @property {any} [body] JSON body (omitted for 204).
 * @property {string[]} [setCookies]
 * @property {boolean} [networkError] Simulate a dropped connection.
 *
 * @typedef {object} Route
 * @property {string} method
 * @property {string} pattern e.g. `users/:id/roles`
 * @property {boolean} [public] No access token required.
 * @property {(req: MockRequest, params: Record<string, string>, auth: any) => MockResponse} handle
 */

/** @param {unknown} body @param {number} [status] @returns {MockResponse} */
export const ok = (body, status = 200) => ({ status, body });

/** @returns {MockResponse} */
export const noContent = () => ({ status: 204 });

/** @param {number} status @param {string} code @param {string} [message] @returns {MockResponse} */
export const fail = (status, code, message = '') => ({
  status,
  body: { error: { code, message } },
});

export const notFound = () => fail(404, 'NOT_FOUND', 'Data tidak ditemukan.');

/**
 * Paginates a list the way the API does: `{ data, page, limit, total }`.
 * @template T
 * @param {T[]} rows
 * @param {URLSearchParams} query
 */
export function paginate(rows, query) {
  const page = Math.max(1, Number(query.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 20));
  return { data: rows.slice((page - 1) * limit, page * limit), page, limit, total: rows.length };
}

/**
 * Case-insensitive `q` search over some fields.
 * @param {Record<string, any>} row
 * @param {string | null} q
 * @param {string[]} fields
 */
export function matchesQuery(row, q, fields) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((field) =>
    String(row[field] ?? '')
      .toLowerCase()
      .includes(needle),
  );
}

/**
 * @param {string} pattern
 * @param {string} path
 * @returns {Record<string, string> | null}
 */
export function matchPattern(pattern, path) {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) return null;
  /** @type {Record<string, string>} */
  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    if (patternParts[i].startsWith(':'))
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    else if (patternParts[i] !== pathParts[i]) return null;
  }
  return params;
}

/**
 * Reads a field from a JSON body or a FormData body.
 * @param {any} body
 * @param {string} name
 */
export function field(body, name) {
  if (body && typeof body.get === 'function') return body.get(name);
  return body?.[name];
}

export const now = () => new Date().toISOString();
