import { AuthGate } from '@/features/auth/components/auth-gate';

/**
 * Every page in this group requires a signed-in user.
 * @param {{ children: import('react').ReactNode }} props
 */
export default function ProtectedLayout({ children }) {
  return <AuthGate>{children}</AuthGate>;
}
