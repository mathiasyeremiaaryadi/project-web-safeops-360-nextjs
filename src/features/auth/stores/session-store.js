import { create } from 'zustand';

/**
 * @typedef {'idle' | 'loading' | 'authenticated' | 'unauthenticated'} SessionStatus
 *
 * @typedef {object} SessionState
 * @property {string | null} accessToken In-memory only. Never persisted.
 * @property {import('@/features/auth/api/schemas').SessionUser | null} user
 * @property {SessionStatus} status
 * @property {(token: string | null) => void} setAccessToken
 * @property {(user: import('@/features/auth/api/schemas').SessionUser | null) => void} setUser
 * @property {(status: SessionStatus) => void} setStatus
 * @property {() => void} clear
 */

const initialState = {
  accessToken: null,
  user: null,
  status: /** @type {SessionStatus} */ ('idle'),
};

/**
 * Session store. Intentionally WITHOUT the `persist` middleware: the access token lives
 * only in memory and is restored after a reload through `POST /auth/refresh` (HttpOnly cookie).
 */
export const useSessionStore = create(
  /** @returns {SessionState} */
  (set) => ({
    ...initialState,
    setAccessToken: (accessToken) => set({ accessToken }),
    setUser: (user) => set({ user, status: user ? 'authenticated' : 'unauthenticated' }),
    setStatus: (status) => set({ status }),
    clear: () => set({ ...initialState, status: 'unauthenticated' }),
  }),
);
