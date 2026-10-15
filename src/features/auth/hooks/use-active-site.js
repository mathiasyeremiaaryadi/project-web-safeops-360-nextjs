'use client';

import { useShallow } from 'zustand/react/shallow';
import { useSessionStore } from '@/features/auth/stores/session-store';

/**
 * The site chosen in the site switcher (`null` = all of the user's sites) and its setter.
 * Reset automatically when the session ends.
 */
export function useActiveSite() {
  return useSessionStore(
    useShallow((state) => ({
      activeSiteId: state.activeSiteId,
      setActiveSiteId: state.setActiveSiteId,
    })),
  );
}
