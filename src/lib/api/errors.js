import { isHTTPError, isNetworkError, isTimeoutError } from 'ky';
import { z } from 'zod';
import { ERROR_CODES } from '@/lib/constants';

/** Shape of the backend error body: `{ "error": { "code": "...", "message": "..." } }`. */
const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().optional().default(''),
  }),
});

/** Normalized error thrown by every API call. */
export class ApiError extends Error {
  /**
   * @param {{ status: number, code: string, message?: string }} params
   *   `status` is 0 for network/timeout errors.
   */
  constructor({ status, code, message = '' }) {
    super(message || code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** True when no HTTP response was received (offline, DNS, CORS, timeout). */
  get isNetworkError() {
    return this.status === 0;
  }
}

/**
 * Maps an HTTP status to a fallback error code when the body has none.
 * @param {number} status
 */
function codeFromStatus(status) {
  if (status === 401) return ERROR_CODES.AUTH_UNAUTHORIZED;
  if (status === 423) return ERROR_CODES.AUTH_ACCOUNT_LOCKED;
  if (status === 429) return ERROR_CODES.RATE_LIMITED;
  return ERROR_CODES.UNKNOWN;
}

/**
 * Converts any thrown value (ky HTTPError, network error, timeout, …) into an `ApiError`.
 * Never includes request/response bodies in the message, which may contain secrets.
 * @param {unknown} error
 * @returns {ApiError}
 */
export function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (isHTTPError(error)) {
    const status = error.response.status;
    const parsed = errorBodySchema.safeParse(error.data);
    if (parsed.success) {
      return new ApiError({
        status,
        code: parsed.data.error.code,
        message: parsed.data.error.message,
      });
    }
    return new ApiError({ status, code: codeFromStatus(status) });
  }

  if (isTimeoutError(error)) {
    return new ApiError({ status: 0, code: ERROR_CODES.TIMEOUT });
  }

  if (isNetworkError(error) || error instanceof TypeError) {
    return new ApiError({ status: 0, code: ERROR_CODES.NETWORK_ERROR });
  }

  return new ApiError({ status: -1, code: ERROR_CODES.UNKNOWN });
}

/** Generic UI messages per status (prompt section 7). Features may override specific codes. */
const STATUS_MESSAGES = Object.freeze({
  403: 'Anda tidak memiliki akses untuk aksi ini.',
  404: 'Data tidak ditemukan.',
  409: 'Data sudah dipakai.',
  413: 'Ukuran file melebihi batas.',
  429: 'Terlalu banyak permintaan. Coba lagi sebentar.',
});

/**
 * User-facing message for a failed request.
 * @param {unknown} error
 * @param {Partial<Record<number, string>>} [overrides] Message per HTTP status.
 */
export function getErrorMessage(error, overrides = {}) {
  if (!(error instanceof ApiError)) return 'Terjadi kesalahan. Coba lagi.';
  if (error.isNetworkError)
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  if (overrides[error.status]) return /** @type {string} */ (overrides[error.status]);
  if (error.status === 400 && error.message && error.message !== error.code) return error.message;
  if (STATUS_MESSAGES[/** @type {keyof typeof STATUS_MESSAGES} */ (error.status)]) {
    return STATUS_MESSAGES[/** @type {keyof typeof STATUS_MESSAGES} */ (error.status)];
  }
  if (error.code === ERROR_CODES.INVALID_RESPONSE)
    return 'Respons server tidak sesuai. Hubungi admin.';
  return 'Terjadi gangguan pada server. Coba beberapa saat lagi.';
}
