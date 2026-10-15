import { TZDate } from '@date-fns/tz';
import { format, formatISO, isValid, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import { clientEnv } from '@/config/client-env';

/*
 * Dates are computed and displayed in APP_TIMEZONE (default Asia/Jakarta). The backend uses
 * the UTC date when `date` is omitted, so the app always sends an explicit `YYYY-MM-DD`.
 */

export const APP_TIMEZONE = clientEnv.NEXT_PUBLIC_APP_TIMEZONE;

/** @param {string | Date | null | undefined} value */
function toZoned(value) {
  if (!value) return null;
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? new TZDate(date, APP_TIMEZONE) : null;
}

/**
 * Today as `YYYY-MM-DD` in APP_TIMEZONE.
 * @param {Date} [now]
 */
export function todayInAppTimezone(now = new Date()) {
  return formatISO(new TZDate(now, APP_TIMEZONE), { representation: 'date' });
}

/**
 * "Rabu, 14 Okt 2026" from `YYYY-MM-DD` (a calendar date, no time zone shift).
 * @param {string} isoDate
 */
export function formatLongDate(isoDate) {
  const date = parseISO(isoDate);
  return isValid(date) ? format(date, 'EEEE, d MMM yyyy', { locale: localeId }) : isoDate;
}

/**
 * "14 Okt 2026, 07.30" in APP_TIMEZONE.
 * @param {string | null | undefined} value
 */
export function formatDateTime(value) {
  const date = toZoned(value);
  return date ? format(date, 'd MMM yyyy, HH.mm', { locale: localeId }) : '—';
}

/**
 * "14 Okt 2026" in APP_TIMEZONE.
 * @param {string | null | undefined} value
 */
export function formatDate(value) {
  const date = toZoned(value);
  return date ? format(date, 'd MMM yyyy', { locale: localeId }) : '—';
}

/**
 * RFC3339 instant of the start (00:00) or end (23:59:59.999) of a calendar day in APP_TIMEZONE.
 * Used for `from`/`to` filters that expect timestamps.
 * @param {string} isoDate `YYYY-MM-DD`
 * @param {'start' | 'end'} edge
 * @returns {string | undefined}
 */
export function dayBoundaryIso(isoDate, edge) {
  const date = parseISO(isoDate);
  if (!isoDate || !isValid(date)) return undefined;
  const zoned = new TZDate(date.getFullYear(), date.getMonth(), date.getDate(), APP_TIMEZONE);
  if (edge === 'end') zoned.setHours(23, 59, 59, 999);
  return new Date(zoned.getTime()).toISOString();
}

/**
 * `YYYY-MM-DD` shifted by whole days (calendar arithmetic, no time zone involved).
 * @param {string} isoDate
 * @param {number} days
 */
export function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/**
 * "07.42" in APP_TIMEZONE.
 * @param {string | null | undefined} value
 */
export function formatTime(value) {
  const date = toZoned(value);
  return date ? format(date, 'HH.mm', { locale: localeId }) : '—';
}
