import { StatusBadge } from '@/components/shared/status-badge';
import { INVENTORY_CONDITION_BADGES } from '@/features/inventories/lib/constants';

/** Inventory condition badge; an unknown value is shown as-is. @param {{ value: string }} props */
export function ConditionBadge({ value }) {
  return <StatusBadge status={INVENTORY_CONDITION_BADGES[value]} fallback={value || '—'} />;
}
