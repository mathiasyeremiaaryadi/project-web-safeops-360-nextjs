'use client';

import dynamic from 'next/dynamic';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Forbidden } from '@/components/layout/forbidden';
import { NavRail } from '@/components/layout/nav-rail';
import { PageTitleProvider } from '@/components/layout/page-title';
import { Sidebar } from '@/components/layout/sidebar';
import { useAppNavigation } from '@/components/layout/use-app-navigation';
import { canAccessPath } from '@/config/navigation';
import { can } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';
import { OfflineBanner } from '@/features/offline';

// Workers only: loaded on demand so the other roles do not ship the IndexedDB code.
const WorkerOfflineSync = dynamic(
  () => import('@/features/task-report').then((m) => m.WorkerOfflineSync),
  { ssr: false },
);

/**
 * Signed-in layout: bottom nav (< 768), icon rail (768–1023) or sidebar (≥ 1024), header,
 * and the role guard (same data as the menu, see config/navigation.js).
 * @param {{ children: import('react').ReactNode }} props
 */
export function AppShell({ children }) {
  const { pathname, user, isFormPage } = useAppNavigation();
  const allowed = canAccessPath(pathname, user?.roles);

  return (
    <TooltipProvider delayDuration={200}>
      <PageTitleProvider>
        <div className="flex min-h-dvh flex-1 flex-col md:pl-[72px] lg:pl-[232px] xl:pl-[248px] 2xl:pl-64">
          <Sidebar />
          <NavRail />
          <AppHeader />
          <OfflineBanner />
          <main
            id="main"
            className={cn(
              'flex-1 px-4 pt-5 md:px-6 md:pt-6 md:pb-10 lg:px-8',
              isFormPage ? 'pb-28' : 'pb-[100px]',
            )}
          >
            {allowed ? children : <Forbidden />}
          </main>
          {isFormPage ? null : <BottomNav />}
          {can(user, 'TASK_REPORT_WRITE') ? <WorkerOfflineSync /> : null}
        </div>
      </PageTitleProvider>
    </TooltipProvider>
  );
}
