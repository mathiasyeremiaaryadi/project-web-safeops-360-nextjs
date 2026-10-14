import { cn } from '@/lib/utils';

/**
 * Actions of a form/detail page. On screens < 768px they stick to the bottom (the bottom nav is
 * hidden on sub-pages); from 768px they sit at the end of the content, right-aligned.
 * @param {{ children: import('react').ReactNode, className?: string }} props
 */
export function StickyActionBar({ children, className }) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mt-6 md:justify-end md:border-0 md:bg-transparent md:p-0 [&>*]:flex-1 md:[&>*]:flex-none',
        className,
      )}
    >
      {children}
    </div>
  );
}
