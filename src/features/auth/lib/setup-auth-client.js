import {
  registerPasswordChangeRequiredHandler,
  registerSessionExpiredHandler,
} from '@/lib/api/client';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { buildLoginUrl } from '@/features/auth/lib/redirect';
import { ROUTES } from '@/lib/constants';

/**
 * Connects the shared HTTP client to the auth feature:
 * - 401 (session gone) → clear the local session and go to the login page;
 * - 403 PASSWORD_CHANGE_REQUIRED → go to /change-password.
 * @param {{ onSessionExpired?: () => void }} [options] Override the redirect (used in tests).
 */
export function setupAuthClient(options = {}) {
  registerPasswordChangeRequiredHandler(() => {
    if (typeof window === 'undefined' || window.location.pathname === ROUTES.CHANGE_PASSWORD)
      return;
    window.location.assign(ROUTES.CHANGE_PASSWORD);
  });
  registerSessionExpiredHandler(
    options.onSessionExpired ??
      (() => {
        useSessionStore.getState().clear();
        if (typeof window === 'undefined') return;
        const { pathname, search } = window.location;
        if (pathname === ROUTES.LOGIN) return;
        window.location.assign(buildLoginUrl(`${pathname}${search}`));
      }),
  );
}
