/** Query keys of the audit-logs feature. */
export const auditLogKeys = Object.freeze({
  all: /** @type {const} */ (['audit-logs']),
  list: (/** @type {Record<string, unknown>} */ params) => [...auditLogKeys.all, 'list', params],
});
