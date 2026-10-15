import { DIRECTIONS, UNITS } from '@/features/sla-shared/constants';

/* Number formatting of SLA & maturity values (Indonesian: "95,6"). */

const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

/** "95,6" @param {number | null | undefined} value */
export const formatScore = (value) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : numberFormat.format(value);

/** Unit suffix per normalised unit. */
const UNIT_SUFFIX = Object.freeze({
  [UNITS.PERCENT]: '%',
  [UNITS.MINUTES]: ' menit',
  [UNITS.SCORE]: '',
});

/**
 * "95,6%", "12 menit", "88,1", or "N/A".
 * @param {number | null | undefined} value
 * @param {string} unit
 * @param {boolean} [isNa]
 */
export function formatIndicatorValue(value, unit, isNa = false) {
  if (isNa) return 'N/A';
  if (value === null || value === undefined) return '—';
  return `${formatScore(value)}${UNIT_SUFFIX[/** @type {keyof typeof UNIT_SUFFIX} */ (unit)] ?? ''}`;
}

/**
 * "≥ 95%", "≤ 15 menit".
 * @param {number | null | undefined} target
 * @param {string} unit
 * @param {string} direction
 */
export function formatTarget(target, unit, direction) {
  if (target === null || target === undefined) return '—';
  const symbol = direction === DIRECTIONS.DOWN ? '≤' : '≥';
  return `${symbol} ${formatIndicatorValue(target, unit)}`;
}
