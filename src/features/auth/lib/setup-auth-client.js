import { registerAuthHandlers } from '@/lib/api/client';
import { refresh } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { buildLoginUrl } from '@/features/auth/lib/redirect';
import { ROUTES } from '@/lib/constants';

let isSetUp = false;

/**
 * Connects the shared HTTP client to the session store. Idempotent.
 * @param {{ onSessionExpired?: () => void }} [options] Override the redirect (used in tests).
 */
export function setupAuthClient(options = {}) {
  if (isSetUp && !options.onSessionExpired) return;
  isSetUp = true;

  registerAuthHandlers({
    getAccessToken: () => useSessionStore.getState().accessToken,
    refresh: async () => {
      const tokens = await refresh();
      useSessionStore.getState().setAccessToken(tokens.access_token);
      return tokens.access_token;
    },
    onSessionExpired:
      options.onSessionExpired ??
      (() => {
        useSessionStore.getState().clear();
        if (typeof window === 'undefined') return;
        const { pathname, search } = window.location;
        if (pathname === ROUTES.LOGIN) return;
        window.location.assign(buildLoginUrl(`${pathname}${search}`));
      }),
  });
}
