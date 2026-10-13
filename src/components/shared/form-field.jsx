'use client';

import { Label } from '@/components/ui/label';
import { ExpandableMessage } from '@/components/shared/expandable-message';
import { cn } from '@/lib/utils';

/**
 * Builds the accessibility props that link an input to its error message.
 * @param {string} id Input id.
 * @param {string | undefined} error
 * @param {string} [extraDescribedBy] Additional ids for `aria-describedby`.
 */
export function getFieldA11yProps(id, error, extraDescribedBy) {
  const describedBy = [error ? `${id}-error` : null, extraDescribedBy].filter(Boolean).join(' ');
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  };
}

/**
 * Label + control + animated error message.
 * @param {object} props
 * @param {string} props.id Id of the control inside `children`.
 * @param {string} props.label
 * @param {string} [props.error]
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function FormField({ id, label, error, className, children }) {
  return (
    <div className={cn('flex flex-col', className)}>
      <Label htmlFor={id} className="mb-2 text-[15px] font-medium text-foreground sm:text-sm">
        {label}
      </Label>
      {children}
      <ExpandableMessage show={Boolean(error)}>
        <p id={`${id}-error`} className="pt-1.5 text-sm text-destructive">
          {error}
        </p>
      </ExpandableMessage>
    </div>
  );
}
