import { ApiError } from '@/lib/api/errors';
import { ERROR_CODES } from '@/lib/constants';

/** UI messages (Bahasa Indonesia). */
export const AUTH_MESSAGES = Object.freeze({
  INVALID_CREDENTIALS: 'Username atau password salah.',
  ACCOUNT_LOCKED:
    'Akun Anda dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.',
  RATE_LIMITED: 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.',
  ACCOUNT_INACTIVE: 'Akun Anda tidak aktif. Hubungi admin.',
  NETWORK: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  SERVER: 'Terjadi gangguan pada server. Coba beberapa saat lagi.',
  INVALID_CURRENT_PASSWORD: 'Password saat ini salah.',
  PASSWORD_CHANGED: 'Password berhasil diganti. Silakan masuk dengan password baru.',
});

/**
 * Maps a login error to a generic UI message. Never distinguishes "unknown username"
 * from "wrong password" (PRD).
 * @param {unknown} error
 * @returns {string}
 */
export function getLoginErrorMessage(error) {
  if (!(error instanceof ApiError)) return AUTH_MESSAGES.SERVER;
  if (error.isNetworkError) return AUTH_MESSAGES.NETWORK;
  if (error.status === 401 || error.code === ERROR_CODES.AUTH_INVALID_CREDENTIALS) {
    return AUTH_MESSAGES.INVALID_CREDENTIALS;
  }
  if (error.status === 423 || error.code === ERROR_CODES.AUTH_ACCOUNT_LOCKED) {
    return AUTH_MESSAGES.ACCOUNT_LOCKED;
  }
  if (error.status === 429) return AUTH_MESSAGES.RATE_LIMITED;
  if (error.status === 403 || error.code === ERROR_CODES.AUTH_ACCOUNT_INACTIVE) {
    return AUTH_MESSAGES.ACCOUNT_INACTIVE;
  }
  return AUTH_MESSAGES.SERVER;
}

/**
 * Classifies a change-password error.
 * @param {unknown} error
 * @returns {{ field: 'current_password', message: string } | { field: null, message: string }}
 */
export function getChangePasswordError(error) {
  if (!(error instanceof ApiError)) return { field: null, message: AUTH_MESSAGES.SERVER };
  if (error.isNetworkError) return { field: null, message: AUTH_MESSAGES.NETWORK };
  if (error.code === ERROR_CODES.AUTH_INVALID_CURRENT_PASSWORD) {
    return { field: 'current_password', message: AUTH_MESSAGES.INVALID_CURRENT_PASSWORD };
  }
  if (error.status === 400) {
    return { field: null, message: error.message || AUTH_MESSAGES.SERVER };
  }
  if (error.status === 429) return { field: null, message: AUTH_MESSAGES.RATE_LIMITED };
  return { field: null, message: AUTH_MESSAGES.SERVER };
}
