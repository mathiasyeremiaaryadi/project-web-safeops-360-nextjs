import { AppShell } from '@/components/layout/app-shell';

/**
 * Pages with the app menu (sidebar / rail / bottom nav) and the role guard.
 * @param {{ children: import('react').ReactNode }} props
 */
export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
