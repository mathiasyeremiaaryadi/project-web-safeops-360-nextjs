'use client';

import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { toastApiError } from '@/lib/notify';
import { PERIOD_LABELS, RULE_TYPE_LABELS } from '@/features/sla-shared';
import { useDeactivateRule } from '@/features/sla-rules/api/queries';

/** @typedef {import('@/features/sla-rules/api/schemas').Rule} Rule */

/** @param {Rule} rule */
const versionText = (rule) =>
  `v${rule.version ?? '?'} (${PERIOD_LABELS[/** @type {keyof typeof PERIOD_LABELS} */ (rule.period_type)] ?? rule.period_type})`;

/**
 * "Nonaktifkan" a rule. A site override falls back to the vendor default (immediately, live
 * scores included); a vendor default leaves the vendor without a rule where no override exists.
 * @param {object} props
 * @param {'sla' | 'maturity'} props.type
 * @param {Rule | null} props.rule `null` closes the dialog.
 * @param {Rule | null} props.vendorDefault The vendor's default rule (for a site override).
 * @param {(rule: Rule) => { vendor: string, site: string }} props.namesOf
 * @param {() => void} props.onClose
 */
export function DeactivateRuleDialog({ type, rule, vendorDefault, namesOf, onClose }) {
  const deactivate = useDeactivateRule(type);
  if (!rule) return null;
  const { vendor, site } = namesOf(rule);
  const fallback = vendorDefault
    ? `aturan default vendor ${versionText(vendorDefault)}`
    : 'tanpa aturan default (vendor belum punya aturan)';
  const description = rule.site_id
    ? `${vendor} di ${site} akan langsung kembali memakai ${fallback}, termasuk untuk skor sementara periode berjalan. Riwayat versi dan skor periode yang sudah ditutup tidak berubah.`
    : `${vendor} akan berstatus belum punya aturan ${RULE_TYPE_LABELS[type]} di site yang tidak punya aturan khusus, termasuk untuk skor sementara periode berjalan. Riwayat versi dan skor periode yang sudah ditutup tidak berubah.`;

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        rule.site_id
          ? `Nonaktifkan aturan khusus ${site}?`
          : `Nonaktifkan aturan default ${vendor}?`
      }
      description={description}
      confirmLabel="Nonaktifkan"
      tone="destructive"
      pending={deactivate.isPending}
      onConfirm={() =>
        deactivate.mutate(rule.id, {
          onSuccess: () => {
            toast.success(`Aturan ${RULE_TYPE_LABELS[type]} dinonaktifkan.`);
            onClose();
          },
          onError: toastApiError,
        })
      }
    />
  );
}
