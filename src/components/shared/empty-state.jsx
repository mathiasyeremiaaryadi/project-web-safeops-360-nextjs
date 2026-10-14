import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "Nothing here" message (empty list, not found, coming soon).
 * @param {object} props
 * @param {string} props.title
 * @param {import('react').ReactNode} [props.description]
 * @param {import('lucide-react').LucideIcon} [props.icon]
 * @param {import('react').ReactNode} [props.action]
 * @param {string} [props.className]
 */
export function EmptyState({ title, description, icon: Icon = Inbox, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <Icon className="size-6" />
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
