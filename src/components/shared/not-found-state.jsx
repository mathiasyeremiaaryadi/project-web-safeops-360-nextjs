import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';

/**
 * Detail page of a record that does not exist or is outside the user's scope (API 404).
 * @param {object} props
 * @param {string} [props.title]
 * @param {import('lucide-react').LucideIcon} [props.icon]
 * @param {string} props.description
 * @param {string} [props.backHref] "Back to the list" link (omit in a side panel).
 * @param {string} [props.backLabel]
 */
export function NotFoundState({
  title = 'Data tidak ditemukan',
  icon = SearchX,
  description,
  backHref,
  backLabel,
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        backHref ? (
          <Link
            href={backHref}
            className={buttonVariants({ variant: 'outline', className: 'h-11 bg-card' })}
          >
            {backLabel}
          </Link>
        ) : null
      }
    />
  );
}

/** Whether a query failed because the record was not found. @param {unknown} error */
export const isNotFound = (error) => /** @type {any} */ (error)?.status === 404;
