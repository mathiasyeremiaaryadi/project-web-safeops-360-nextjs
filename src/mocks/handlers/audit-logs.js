import { ok, paginate } from '../go/http.js';

/**
 * Mock `GET /audit-logs?user=&action=&entity=&from=&to=&page=&limit=` (from/to: RFC3339).
 * @param {{ db: () => import('../go/seed.js').MockDb }} ctx
 * @returns {import('../go/http.js').Route[]}
 */
export function auditLogRoutes({ db }) {
  return [
    {
      method: 'GET',
      pattern: 'audit-logs',
      handle: (req) => {
        const user = req.query.get('user');
        /** `user` is a user id (assumed, docs/ASSUMPTIONS.md AL2). @param {string} id */
        const usernameOf = (id) => db().users.find((u) => u.id === id)?.username ?? id;
        const action = req.query.get('action');
        const entity = req.query.get('entity');
        const from = req.query.get('from');
        const to = req.query.get('to');
        const rows = db()
          .auditLogs.filter((log) => !user || log.actor_username === usernameOf(user))
          .filter((log) => !action || log.action === action)
          .filter((log) => !entity || log.entity === entity)
          .filter((log) => !from || log.created_at >= from)
          .filter((log) => !to || log.created_at <= to)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        return ok(paginate(rows, req.query));
      },
    },
  ];
}
