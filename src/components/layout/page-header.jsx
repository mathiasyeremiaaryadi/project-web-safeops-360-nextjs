'use client';

import { useRegisterPageTitle } from '@/components/layout/page-title';
import { cn } from '@/lib/utils';

/**
 * Page title, description and action slot. On screens < 768px the title lives in the top
 * bar, so only the description and actions are shown here.
 * @param {object} props
 * @param {string} props.title
 * @param {import('react').ReactNode} [props.description]
 * @param {import('react').ReactNode} [props.actions]
 * @param {string} [props.className]
 */
export function PageHeader({ title, description, actions, className }) {
  useRegisterPageTitle(title);

  return (
    <div
      className={cn(
        'mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="sr-only text-2xl font-bold tracking-tight text-foreground md:not-sr-only md:text-[28px] md:leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground md:mt-1 md:text-[15px]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
