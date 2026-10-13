import { AppLogo } from '@/components/shared/app-logo';

/**
 * Top bar for signed-in pages: logo + product name on the left, `actions` on the right.
 * @param {{ actions?: import('react').ReactNode }} props
 */
export function AppTopBar({ actions }) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between border-b bg-card px-4 sm:px-5">
      <div className="flex items-center gap-3">
        <AppLogo size={32} />
        <span className="text-base font-bold text-foreground">SafeOps 360</span>
      </div>
      {actions}
    </header>
  );
}
