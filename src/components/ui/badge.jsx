import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';

/**
 * Status badge variants (SafeOps tokens). This is the single place where status colours live;
 * features map their enums to a variant in their own `constants.js`.
 */
const badgeVariants = cva(
  'group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        success: 'bg-success-bg text-success',
        warning: 'bg-warning-bg text-warning',
        danger: 'bg-danger-bg text-danger',
        info: 'bg-info-bg text-info',
        neutral: 'bg-muted text-muted-foreground',
        revision: 'bg-revision-bg text-revision',
        dark: 'bg-brand-dark text-brand-dark-foreground',
        outline: 'border-border bg-card text-foreground',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

/**
 * @param {import('react').ComponentProps<'span'> & {
 *   variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'revision' | 'dark' | 'outline',
 *   asChild?: boolean,
 * }} props
 */
function Badge({ className, variant = 'neutral', asChild = false, ...props }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
