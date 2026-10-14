import { fail, matchesQuery, noContent, notFound, now, ok, paginate } from '../go/http.js';
import { toUserResponse } from './auth.js';

const USERNAME = /^[a-z0-9._]{3,30}$/;
const ROLE_CODES = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_WORKER', 'WORKER'];

/** Mock temporary password (8 chars, letters + digits). */
function temporaryPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
  const pick = () => letters[Math.floor(Math.random() * letters.length)];
  return `${pick()}${pick()}${Math.floor(Math.random() * 10)}${pick()}${pick()}${Math.floor(Math.random() * 10)}${pick()}${pick()}`;
}

/**
 * FR-18 scope rules (also enforced by the real backend).
 * @param {string[]} roles
 * @param {{ site_ids: string[], vendor_ids: string[] }} scopes
 */
function scopeError(roles, scopes) {
  if (!roles.length || roles.some((role) => !ROLE_CODES.includes(role))) return 'Role tidak valid.';
  if (roles.includes('ADMIN') && scopes.site_ids.length < 1)
    return 'Role Admin wajib minimal satu site.';
  const vendorRole = roles.includes('ADMIN_WORKER') || roles.includes('WORKER');
  if (vendorRole && scopes.vendor_ids.length !== 1)
    return 'Admin Worker dan Worker wajib tepat satu vendor.';
  return null;
}

/** @param {any} body @param {any} fallback */
function readScopes(body, fallback) {
  return {
    site_ids: Array.isArray(body?.site_ids) ? body.site_ids : fallback.site_ids,
    vendor_ids: Array.isArray(body?.vendor_ids) ? body.vendor_ids : fallback.vendor_ids,
  };
}

/** @param {any} user @param {string} status */
function matchesStatus(user, status) {
  if (!status) return true;
  if (status === 'ACTIVE') return user.is_active;
  if (status === 'INACTIVE') return !user.is_active;
  return true;
}

/**
 * @param {{ db: () => import('../go/seed.js').MockDb, sessions: import('../go/sessions.js').SessionStore, audit: (entry: any) => void }} ctx
 * @returns {import('../go/http.js').Route[]}
 */
export function userRoutes({ db, sessions, audit }) {
  const find = (/** @type {string} */ id) => db().users.find((user) => user.id === id);

  return [
    {
      method: 'GET',
      pattern: 'users',
      handle: (req) => {
        const role = req.query.get('role');
        const rows = db()
          .users.filter((u) => matchesQuery(u, req.query.get('q'), ['username', 'full_name']))
          .filter((u) => !role || u.roles.includes(role))
          .filter((u) => matchesStatus(u, req.query.get('status') ?? ''));
        return ok(paginate(rows.map(toUserResponse), req.query));
      },
    },
    {
      method: 'POST',
      pattern: 'users',
      handle: (req, _params, auth) => {
        const body = req.body ?? {};
        const username = String(body.username ?? '');
        const roles = Array.isArray(body.roles) ? body.roles : [];
        const scopes = readScopes(body, { site_ids: [], vendor_ids: [] });
        if (!USERNAME.test(username)) return fail(400, 'VALIDATION_ERROR', 'Username tidak valid.');
        if (db().users.some((u) => u.username === username))
          return fail(409, 'USERNAME_TAKEN', 'Username sudah dipakai.');
        const invalid = scopeError(roles, scopes);
        if (invalid) return fail(400, 'VALIDATION_ERROR', invalid);
        const generated = body.password ? null : temporaryPassword();
        const user = {
          id: crypto.randomUUID(),
          username,
          full_name: body.full_name || null,
          email: body.email || null,
          phone: body.phone || null,
          password: body.password || generated,
          roles,
          scopes,
          is_active: true,
          locked_until: null,
          must_change_password: true,
          last_login_at: null,
          created_at: now(),
        };
        db().users.push(user);
        audit({
          action: 'CREATE',
          entity: 'users',
          entity_id: user.id,
          actor: auth.user,
          summary: `User ${username} dibuat`,
          after: { username, roles },
        });
        return ok(
          { user: toUserResponse(user), ...(generated ? { temporary_password: generated } : {}) },
          201,
        );
      },
    },
    {
      method: 'GET',
      pattern: 'users/:id',
      handle: (_req, { id }) => {
        const user = find(id);
        return user ? ok(toUserResponse(user)) : notFound();
      },
    },
    {
      method: 'PATCH',
      pattern: 'users/:id',
      handle: (req, { id }, auth) => {
        const user = find(id);
        if (!user) return notFound();
        for (const key of ['full_name', 'email', 'phone']) {
          if (key in (req.body ?? {})) user[key] = req.body[key] || null;
        }
        if (typeof req.body?.is_active === 'boolean') {
          user.is_active = req.body.is_active;
          if (!user.is_active) sessions.revokeUser(user.id);
        }
        audit({
          action: 'UPDATE',
          entity: 'users',
          entity_id: id,
          actor: auth.user,
          summary: `User ${user.username} diubah`,
          after: req.body,
        });
        return ok(toUserResponse(user));
      },
    },
    {
      method: 'POST',
      pattern: 'users/:id/reset-password',
      handle: (req, { id }, auth) => {
        const user = find(id);
        if (!user) return notFound();
        const password = req.body?.password || temporaryPassword();
        Object.assign(user, { password, must_change_password: true, locked_until: null });
        sessions.revokeUser(user.id);
        audit({
          action: 'RESET_PASSWORD',
          entity: 'users',
          entity_id: id,
          actor: auth.user,
          summary: `Password ${user.username} direset`,
        });
        return ok({ temporary_password: password });
      },
    },
    ...['roles', 'scopes'].map((kind) => ({
      method: 'PUT',
      pattern: `users/:id/${kind}`,
      handle: (/** @type {any} */ req, /** @type {any} */ { id }, /** @type {any} */ auth) => {
        const user = find(id);
        if (!user) return notFound();
        const roles = Array.isArray(req.body?.roles) ? req.body.roles : user.roles;
        const scopes = readScopes(req.body, user.scopes);
        const invalid = scopeError(roles, scopes);
        if (invalid) return fail(400, 'VALIDATION_ERROR', invalid);
        Object.assign(user, { roles, scopes });
        sessions.revokeUser(user.id);
        audit({
          action: 'UPDATE',
          entity: `user_${kind}`,
          entity_id: id,
          actor: auth.user,
          summary: `${kind === 'roles' ? 'Role' : 'Scope'} ${user.username} diubah`,
          after: { roles, ...scopes },
        });
        return ok(toUserResponse(user));
      },
    })),
    {
      method: 'DELETE',
      pattern: 'users/:id/sessions',
      handle: (_req, { id }, auth) => {
        const user = find(id);
        if (!user) return notFound();
        sessions.revokeUser(user.id);
        audit({
          action: 'REVOKE_SESSIONS',
          entity: 'sessions',
          entity_id: id,
          actor: auth.user,
          summary: `Semua sesi ${user.username} dicabut`,
        });
        return noContent();
      },
    },
    {
      method: 'GET',
      pattern: 'roles',
      handle: () => ok({ data: ROLE_CODES.map((code, index) => ({ id: index + 1, code })) }),
    },
  ];
}
