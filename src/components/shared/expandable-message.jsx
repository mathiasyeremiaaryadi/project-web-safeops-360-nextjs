'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Reveals a message with a smooth height transition instead of pushing content abruptly.
 * The last message is kept while collapsing so the text does not vanish mid-animation.
 * @param {object} props
 * @param {boolean} props.show
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className] Classes for the inner wrapper.
 */
export function ExpandableMessage({ show, children, className }) {
  const [lastChildren, setLastChildren] = useState(children);
  if (show && children && children !== lastChildren) setLastChildren(children);

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
        show ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
      aria-hidden={show ? undefined : true}
    >
      <div className={cn('min-h-0 overflow-hidden', className)}>
        {show ? children : lastChildren}
      </div>
    </div>
  );
}
