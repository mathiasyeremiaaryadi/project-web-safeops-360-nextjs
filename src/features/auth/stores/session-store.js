import { create } from 'zustand';

/**
 * @typedef {'idle' | 'loading' | 'authenticated' | 'unauthenticated'} SessionStatus
 *
 * @typedef {object} SessionState
 * @property {import('@/features/auth/api/schemas').SessionUser | null} user
 * @property {SessionStatus} status
 * @property {(user: import('@/features/auth/api/schemas').SessionUser | null) => void} setUser
 * @property {(status: SessionStatus) => void} setStatus
 * @property {() => void} clear
 */

const initialState = { user: null, status: /** @type {SessionStatus} */ ('idle') };

/**
 * Client view of the session: only the user profile, in memory, for rendering.
 * There is NO token here — the Go tokens stay on the BFF (encrypted HttpOnly cookie).
 */
export const useSessionStore = create(
  /** @returns {SessionState} */
  (set) => ({
    ...initialState,
    setUser: (user) => set({ user, status: user ? 'authenticated' : 'unauthenticated' }),
    setStatus: (status) => set({ status }),
    clear: () => set({ ...initialState, status: 'unauthenticated' }),
  }),
);
