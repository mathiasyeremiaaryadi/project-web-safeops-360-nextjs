import { describe, expect, it } from 'vitest';
import { nextSortOrder, sortItems, swapWithNeighbour } from '@/features/pipelines/lib/order';

const items = sortItems([
  { id: 'c', sort_order: 30 },
  { id: 'a', sort_order: 10 },
  { id: 'b', sort_order: 20 },
]);

describe('pipeline task order', () => {
  it('sorts by sort_order', () => {
    expect(items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('moves a task up or down by swapping sort_order with its neighbour', () => {
    expect(swapWithNeighbour(items, 1, -1)).toEqual([
      { id: 'b', sort_order: 10 },
      { id: 'a', sort_order: 20 },
    ]);
    expect(swapWithNeighbour(items, 1, 1)).toEqual([
      { id: 'b', sort_order: 30 },
      { id: 'c', sort_order: 20 },
    ]);
  });

  it('does nothing at the edges', () => {
    expect(swapWithNeighbour(items, 0, -1)).toEqual([]);
    expect(swapWithNeighbour(items, 2, 1)).toEqual([]);
  });

  it('appends new tasks after the last one', () => {
    expect(nextSortOrder(items)).toBe(31);
    expect(nextSortOrder([])).toBe(1);
  });
});
