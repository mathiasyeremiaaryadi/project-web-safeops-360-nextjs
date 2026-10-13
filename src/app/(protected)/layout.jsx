import { AppTopBar } from '@/components/shared/app-top-bar';
import { AuthGate } from '@/features/auth/components/auth-gate';
import { LogoutButton } from '@/features/auth/components/logout-button';

/**
 * Layout for every page that requires a signed-in user.
 * @param {{ children: import('react').ReactNode }} props
 */
export default function ProtectedLayout({ children }) {
  return (
    <AuthGate>
      <div className="flex min-h-dvh flex-1 flex-col">
        <AppTopBar actions={<LogoutButton />} />
        {children}
      </div>
    </AuthGate>
  );
}
