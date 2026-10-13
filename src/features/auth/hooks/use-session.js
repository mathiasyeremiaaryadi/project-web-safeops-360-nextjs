'use client';

import { useShallow } from 'zustand/react/shallow';
import { useSessionStore } from '@/features/auth/stores/session-store';

/**
 * Read-only view of the current session.
 * @returns {{
 *   user: import('@/features/auth/api/schemas').SessionUser | null,
 *   status: import('@/features/auth/stores/session-store').SessionStatus,
 *   isAuthenticated: boolean,
 * }}
 */
export function useSession() {
  const { user, status } = useSessionStore(
    useShallow((state) => ({ user: state.user, status: state.status })),
  );
  return { user, status, isAuthenticated: status === 'authenticated' && user !== null };
}
