import { create } from 'zustand';

/**
 * @typedef {'idle' | 'loading' | 'authenticated' | 'unauthenticated'} SessionStatus
 *
 * @typedef {object} SessionState
 * @property {import('@/features/auth/api/schemas').SessionUser | null} user
 * @property {SessionStatus} status
 * @property {string | null} activeSiteId Site chosen in the site switcher (Admin with several
 *   sites); `null` = all of the user's sites. UI state only: memory, never persisted.
 * @property {(user: import('@/features/auth/api/schemas').SessionUser | null) => void} setUser
 * @property {(status: SessionStatus) => void} setStatus
 * @property {(siteId: string | null) => void} setActiveSiteId
 * @property {() => void} clear
 */

const initialState = {
  user: null,
  status: /** @type {SessionStatus} */ ('idle'),
  activeSiteId: /** @type {string | null} */ (null),
};

/**
 * Client view of the session: the user profile and the active site, in memory, for rendering.
 * There is NO token here — the Go tokens stay on the BFF (encrypted HttpOnly cookie).
 * `clear()` (logout, expired session, password change) also resets the active site.
 */
export const useSessionStore = create(
  /** @returns {SessionState} */
  (set) => ({
    ...initialState,
    setUser: (user) =>
      set((state) => ({
        user,
        status: user ? 'authenticated' : 'unauthenticated',
        // Another account signs in: its sites differ.
        activeSiteId: state.user?.id === user?.id ? state.activeSiteId : null,
      })),
    setActiveSiteId: (activeSiteId) => set({ activeSiteId }),
    setStatus: (status) => set({ status }),
    clear: () => set({ ...initialState, status: 'unauthenticated' }),
  }),
);
