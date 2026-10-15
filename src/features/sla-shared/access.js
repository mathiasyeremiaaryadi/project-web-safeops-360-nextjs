import { can } from '@/lib/auth/permissions';

/*
 * Who may change which rule. A vendor default (`site_id: null`) needs SLA_RULES_CREATE_DEFAULT
 * (Super Admin); a site override needs SLA_RULES_CREATE_SITE_OVERRIDE (Super Admin, Admin of the
 * site — the backend checks the site with a 403).
 */

/** @param {any} user @param {{ site_id: string | null }} rule */
export const canEditRule = (user, rule) =>
  rule.site_id
    ? can(user, 'SLA_RULES_CREATE_SITE_OVERRIDE')
    : can(user, 'SLA_RULES_CREATE_DEFAULT');

/** @param {any} user @param {{ site_id: string | null }} rule */
export const canDeactivateRule = (user, rule) =>
  canEditRule(user, rule) && can(user, 'SLA_RULES_DEACTIVATE');

/** May create any rule (shows "Buat aturan SLA" calls to action). @param {any} user */
export const canCreateRules = (user) =>
  can(user, 'SLA_RULES_CREATE_DEFAULT') || can(user, 'SLA_RULES_CREATE_SITE_OVERRIDE');

/** Only site overrides (Admin): never send `site_id: null`. @param {any} user */
export const siteOverridesOnly = (user) =>
  !can(user, 'SLA_RULES_CREATE_DEFAULT') && can(user, 'SLA_RULES_CREATE_SITE_OVERRIDE');
