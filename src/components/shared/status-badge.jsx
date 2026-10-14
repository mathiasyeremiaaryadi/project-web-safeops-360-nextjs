import { Badge } from '@/components/ui/badge';

/**
 * Badge for an enum value. Features pass `variant` and `label` from their `constants.js`.
 * @param {object} props
 * @param {{ variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'revision' | 'dark' | 'outline', label: string } | undefined} props.status
 * @param {string} [props.fallback] Shown for unknown values.
 * @param {string} [props.className]
 */
export function StatusBadge({ status, fallback = '—', className }) {
  if (!status)
    return (
      <Badge variant="neutral" className={className}>
        {fallback}
      </Badge>
    );
  return (
    <Badge variant={status.variant} className={className}>
      {status.label}
    </Badge>
  );
}
