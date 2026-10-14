/*
 * Public API of the auth feature for other features and the app shell.
 * Other features import from '@/features/auth' only — never from its internals.
 */
export { ChangePasswordForm } from '@/features/auth/components/change-password-form';
export { useSession } from '@/features/auth/hooks/use-session';
export { useLogout, useLogoutAll } from '@/features/auth/hooks/use-logout';
