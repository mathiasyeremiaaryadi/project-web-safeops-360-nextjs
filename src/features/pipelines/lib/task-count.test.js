import { describe, expect, it } from 'vitest';
import { formatTaskCount } from '@/features/pipelines/lib/task-count';

describe('formatTaskCount', () => {
  it('shows active tasks, and inactive ones only when there are any', () => {
    expect(formatTaskCount({ item_count: 12, inactive_item_count: 0 })).toBe('12 task');
    expect(formatTaskCount({ item_count: 12, inactive_item_count: 2 })).toBe(
      '12 task · 2 nonaktif',
    );
    expect(formatTaskCount({ item_count: 0 })).toBe('0 task');
  });

  it('shows a dash when the API sends no count', () => {
    expect(formatTaskCount({})).toBe('—');
  });
});
