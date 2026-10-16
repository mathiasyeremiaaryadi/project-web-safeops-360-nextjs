/**
 * "12 task" or "12 task · 2 nonaktif" for a pipeline row (`item_count` = active tasks,
 * `inactive_item_count` = deactivated ones); "—" when the API sends no count.
 * @param {{ item_count?: number | null, inactive_item_count?: number | null }} pipeline
 */
export function formatTaskCount(pipeline) {
  if (typeof pipeline.item_count !== 'number') return '—';
  const inactive = pipeline.inactive_item_count ?? 0;
  return inactive > 0
    ? `${pipeline.item_count} task · ${inactive} nonaktif`
    : `${pipeline.item_count} task`;
}
