import { StatusBadge } from '@/components/shared/status-badge';
import { ACTION_BADGES } from '@/features/audit-logs/constants';

/** @param {{ action: string }} props */
export function ActionBadge({ action }) {
  const status = ACTION_BADGES[/** @type {keyof typeof ACTION_BADGES} */ (action)] ?? {
    label: action,
    variant: 'neutral',
  };
  return <StatusBadge status={status} className="font-mono" />;
}
