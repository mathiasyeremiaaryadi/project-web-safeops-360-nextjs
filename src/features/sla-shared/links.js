/* Links of the SLA rule pages (type and scope travel in the query string). */

/** @param {Record<string, string | null | undefined>} params */
const query = (params) =>
  new URLSearchParams(
    Object.entries(params).filter(([, value]) => value) /** @type {[string, string][]} */,
  ).toString();

/**
 * "Buat aturan", optionally prefilled from a call to action.
 * @param {'sla' | 'maturity'} type
 * @param {{ vendor_id?: string, site_id?: string }} prefill
 */
export const ruleNewHref = (type, prefill) => `/sla/rules/new?${query({ type, ...prefill })}`;

/** Read-only form ("Lihat"). @param {'sla' | 'maturity'} type @param {string} id */
export const ruleViewHref = (type, id) => `/sla/rules/${id}/edit?${query({ type, view: '1' })}`;

/** @param {'sla' | 'maturity'} type @param {string} id */
export const ruleEditHref = (type, id) => `/sla/rules/${id}/edit?${query({ type })}`;

/**
 * "Riwayat" of a vendor (+ site) rule.
 * @param {'sla' | 'maturity'} type
 * @param {{ vendor_id: string, site_id: string | null }} rule
 */
export const ruleHistoryHref = (type, rule) =>
  `/sla/rules/history?${query({ type, vendor_id: rule.vendor_id, site_id: rule.site_id })}`;
