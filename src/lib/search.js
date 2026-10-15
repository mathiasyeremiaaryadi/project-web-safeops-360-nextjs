/**
 * Case-insensitive "contains" search over a row's fields. Used on top of the server `?q=`
 * filter, so search still narrows the loaded rows if the backend ignores `q`.
 * @template T
 * @param {T[]} rows
 * @param {string} query
 * @param {(row: T) => (string | null | undefined)[]} fields Searchable values of a row.
 * @returns {T[]}
 */
export function searchRows(rows, query, fields) {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    fields(row).some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(needle),
    ),
  );
}

/**
 * Compares two sort values: numbers numerically, everything else as Indonesian text
 * (case-insensitive, natural order so "VND-2" < "VND-10"). Empty values go last.
 * @param {string | number | null | undefined} a
 * @param {string | number | null | undefined} b
 */
export function compareValues(a, b) {
  const emptyA = a === null || a === undefined || a === '';
  const emptyB = b === null || b === undefined || b === '';
  if (emptyA || emptyB) return Number(emptyA) - Number(emptyB);
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'id', { sensitivity: 'base', numeric: true });
}

/**
 * Exact-match filters (`status`, `vendor_id`, …) applied to the loaded rows too, in case the
 * backend ignores a filter it was sent. Case-insensitive. Empty filter values are skipped, and so
 * are fields the rows do not have (the server's answer is trusted for those).
 * @template {Record<string, any>} T
 * @param {T[]} rows
 * @param {Record<string, string | number | null | undefined>} filters
 * @returns {T[]}
 */
export function filterRows(rows, filters) {
  const active = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  );
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every(([key, value]) => {
      const own = row[key];
      return (
        own === undefined ||
        own === null ||
        String(own).toLowerCase() === String(value).toLowerCase()
      );
    }),
  );
}
