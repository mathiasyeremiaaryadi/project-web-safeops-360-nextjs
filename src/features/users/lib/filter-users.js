/**
 * Role and status filters applied to the loaded page too, in case the backend ignores
 * `?role=` / `?status=` (the search works the same way). "Aktif" = the account is active, even
 * if locked or waiting for a password change; "Nonaktif" = deactivated.
 * @template {{ roles: string[], is_active: boolean }} T
 * @param {T[]} users
 * @param {{ role?: string, status?: string }} filters
 * @returns {T[]}
 */
export function filterUsers(users, { role = '', status = '' }) {
  return users.filter(
    (user) =>
      (!role || user.roles.includes(role)) && (!status || user.is_active === (status === 'ACTIVE')),
  );
}
