import { cn } from '@/lib/utils';

/**
 * Up to two initials from a name (falls back to the username).
 * @param {string | null | undefined} name
 */
export function getInitials(name) {
  const parts = (name ?? '')
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? '');
  return `${first}${second}`.toUpperCase();
}

const SIZES = Object.freeze({
  sm: 'size-9 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-xl',
});

/**
 * Circle with initials.
 * @param {object} props
 * @param {string | null | undefined} props.name
 * @param {'sm' | 'md' | 'lg'} [props.size]
 * @param {string} [props.className]
 */
export function UserAvatar({ name, size = 'sm', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-dark-active font-semibold text-brand-dark-foreground',
        SIZES[size],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
