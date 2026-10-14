import { AppTopBar } from '@/components/shared/app-top-bar';
import { LogoutButton } from '@/features/auth/components/logout-button';

/**
 * Minimal layout for the password change (no app menu: a user who must change the password
 * cannot use the rest of the app yet).
 * @param {{ children: import('react').ReactNode }} props
 */
export default function ChangePasswordLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <AppTopBar actions={<LogoutButton />} />
      {children}
    </div>
  );
}
