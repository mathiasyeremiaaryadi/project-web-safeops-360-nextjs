import { TZDate } from '@date-fns/tz';
import { format, formatISO, isValid, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import { clientEnv } from '@/config/client-env';

/*
 * Dates are computed and displayed in APP_TIMEZONE (default Asia/Jakarta). Work at a site
 * (shift hours, report dates, open/close times) is shown in the site's own IANA time zone
 * (`site_timezone`), so a site in WITA or WIT reads its local clock.
 */

export const APP_TIMEZONE = clientEnv.NEXT_PUBLIC_APP_TIMEZONE;

/** Indonesian time zones a site can use (`sites.timezone`). */
export const SITE_TIMEZONES = Object.freeze([
  { value: 'Asia/Jakarta', label: 'WIB (UTC+7) · Sumatra, Jawa, Kalbar, Kalteng' },
  { value: 'Asia/Makassar', label: 'WITA (UTC+8) · Bali, Nusa Tenggara, Kalsel, Kaltim, Sulawesi' },
  { value: 'Asia/Jayapura', label: 'WIT (UTC+9) · Maluku, Papua' },
]);

const ZONE_ABBREVIATIONS = /** @type {Record<string, string>} */ ({
  'Asia/Jakarta': 'WIB',
  'Asia/Pontianak': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
});

/**
 * "WITA" for `Asia/Makassar`; another zone is shown as its IANA name.
 * @param {string | null | undefined} timeZone
 */
export function timezoneLabel(timeZone) {
  if (!timeZone) return ZONE_ABBREVIATIONS[APP_TIMEZONE] ?? APP_TIMEZONE;
  return ZONE_ABBREVIATIONS[timeZone] ?? timeZone;
}

/**
 * @param {string | Date | null | undefined} value
 * @param {string | null | undefined} [timeZone] defaults to APP_TIMEZONE
 */
function toZoned(value, timeZone) {
  if (!value) return null;
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? new TZDate(date, timeZone || APP_TIMEZONE) : null;
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
 * "14 Okt 2026, 07.30 WITA" — a time at a site, read on the site's clock and labelled with its
 * zone, so WIB/WITA/WIT sites are never confused.
 * @param {string | null | undefined} value
 * @param {string | null | undefined} timeZone the site's IANA zone (default APP_TIMEZONE)
 * @param {{ dateless?: boolean }} [options] `dateless`: only "07.30 WITA"
 */
export function formatSiteTime(value, timeZone, { dateless = false } = {}) {
  const date = toZoned(value, timeZone);
  if (!date) return '—';
  const text = format(date, dateless ? 'HH.mm' : 'd MMM yyyy, HH.mm', { locale: localeId });
  return `${text} ${timezoneLabel(timeZone)}`;
}

/**
 * "14 Okt 2026, 07.30" in `timeZone` (default APP_TIMEZONE).
 * @param {string | null | undefined} value
 * @param {string | null} [timeZone]
 */
export function formatDateTime(value, timeZone) {
  const date = toZoned(value, timeZone);
  return date ? format(date, 'd MMM yyyy, HH.mm', { locale: localeId }) : '—';
}

/**
 * "14 Okt 2026" in `timeZone` (default APP_TIMEZONE).
 * @param {string | null | undefined} value
 * @param {string | null} [timeZone]
 */
export function formatDate(value, timeZone) {
  const date = toZoned(value, timeZone);
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
 * "07.42" in `timeZone` (default APP_TIMEZONE).
 * @param {string | null | undefined} value
 * @param {string | null} [timeZone]
 */
export function formatTime(value, timeZone) {
  const date = toZoned(value, timeZone);
  return date ? format(date, 'HH.mm', { locale: localeId }) : '—';
}
