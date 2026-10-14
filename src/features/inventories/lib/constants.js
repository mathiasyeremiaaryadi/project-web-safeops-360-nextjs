/** Inventory condition (`status_condition`) — values assumed, docs/ASSUMPTIONS.md (INV1). */
export const INVENTORY_CONDITION = Object.freeze({
  GOOD: 'GOOD',
  DAMAGED: 'DAMAGED',
  MAINTENANCE: 'MAINTENANCE',
  LOST: 'LOST',
});

export const INVENTORY_CONDITION_BADGES = Object.freeze({
  [INVENTORY_CONDITION.GOOD]: { label: 'Baik', variant: 'success' },
  [INVENTORY_CONDITION.DAMAGED]: { label: 'Rusak', variant: 'danger' },
  [INVENTORY_CONDITION.MAINTENANCE]: { label: 'Perawatan', variant: 'warning' },
  [INVENTORY_CONDITION.LOST]: { label: 'Hilang', variant: 'neutral' },
});

/** Condition chips of the list; `''` = all. */
export const CONDITION_FILTERS = Object.freeze([
  { value: '', label: 'Semua' },
  ...Object.entries(INVENTORY_CONDITION_BADGES).map(([value, badge]) => ({
    value,
    label: badge.label,
  })),
]);
