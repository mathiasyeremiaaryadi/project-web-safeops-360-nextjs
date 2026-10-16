import { ROLES } from '@/lib/constants';
import { getPrimaryRole } from '@/lib/auth/permissions';

/**
 * The one role whose accounts a manager creates and manages (the backend enforces it):
 * Admin manages the Admin Workers of vendors at their sites, an Admin Worker the Workers of their
 * vendor. `null` for Super Admin (any role) and for users who manage no accounts.
 * @param {{ roles?: readonly string[] } | null | undefined} user
 * @returns {string | null}
 */
export function managedRoleOf(user) {
  switch (getPrimaryRole(user?.roles)) {
    case ROLES.ADMIN:
      return ROLES.ADMIN_WORKER;
    case ROLES.ADMIN_WORKER:
      return ROLES.WORKER;
    default:
      return null;
  }
}
