/**
 * Pipeline items sorted by `sort_order`.
 * @template {{ sort_order: number }} T
 * @param {T[]} items
 */
export function sortItems(items) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Moving an item up/down = swapping its `sort_order` with its neighbour.
 * @param {{ id: string, sort_order: number }[]} sorted Items already sorted.
 * @param {number} index Item to move.
 * @param {-1 | 1} direction -1 = up, 1 = down.
 * @returns {{ id: string, sort_order: number }[]} PATCHes to send (empty at the edges).
 */
export function swapWithNeighbour(sorted, index, direction) {
  const current = sorted[index];
  const neighbour = sorted[index + direction];
  if (!current || !neighbour) return [];
  return [
    { id: current.id, sort_order: neighbour.sort_order },
    { id: neighbour.id, sort_order: current.sort_order },
  ];
}

/**
 * `sort_order` for a task appended at the end.
 * @param {{ sort_order: number }[]} items
 */
export function nextSortOrder(items) {
  return items.reduce((max, item) => Math.max(max, item.sort_order), 0) + 1;
}
