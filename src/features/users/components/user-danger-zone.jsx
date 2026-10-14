'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FormCard } from '@/components/shared/form-layout';
import { getErrorMessage } from '@/lib/api/errors';
import {
  useResetUserPassword,
  useRevokeUserSessions,
  useUpdateUser,
} from '@/features/users/api/mutations';
import { TemporaryPasswordDialog } from '@/features/users/components/temporary-password-dialog';
import { SIGN_OUT_WARNING } from '@/features/users/constants';

const ACTIONS = Object.freeze({
  RESET: {
    title: 'Reset password user ini?',
    description: 'Password sementara baru dibuat dan user wajib menggantinya saat login.',
    confirmLabel: 'Reset password',
  },
  REVOKE: {
    title: 'Cabut semua sesi?',
    description: 'User keluar dari semua perangkat dan harus login lagi.',
    confirmLabel: 'Cabut semua sesi',
  },
  DEACTIVATE: {
    title: 'Nonaktifkan user ini?',
    description: 'User tidak bisa login sampai diaktifkan lagi, dan keluar dari semua perangkat.',
    confirmLabel: 'Nonaktifkan user',
  },
  ACTIVATE: {
    title: 'Aktifkan user ini?',
    description: 'User bisa login lagi dengan password yang berlaku.',
    confirmLabel: 'Aktifkan user',
  },
});

/** @param {unknown} error */
const showError = (error) => toast.error(getErrorMessage(error));

/**
 * Reset password, revoke sessions, activate/deactivate. A Super Admin cannot deactivate themself.
 * @param {{ user: import('@/features/users/api/schemas').User, isSelf: boolean }} props
 */
export function UserDangerZone({ user, isSelf }) {
  const [action, setAction] = useState(/** @type {keyof typeof ACTIONS | null} */ (null));
  const [password, setPassword] = useState(/** @type {string | null} */ (null));
  const resetPassword = useResetUserPassword(user.id);
  const revokeSessions = useRevokeUserSessions(user.id);
  const updateUser = useUpdateUser(user.id);
  const close = () => setAction(null);

  const run = () => {
    if (action === 'RESET') {
      resetPassword.mutate(undefined, {
        onSuccess: ({ temporary_password: temp }) => {
          close();
          if (temp) setPassword(temp);
          else toast.success('Password berhasil direset.');
        },
        onError: showError,
      });
    }
    if (action === 'REVOKE') {
      revokeSessions.mutate(undefined, {
        onSuccess: () => {
          close();
          toast.success('Semua sesi user dicabut.');
        },
        onError: showError,
      });
    }
    if (action === 'DEACTIVATE' || action === 'ACTIVATE') {
      updateUser.mutate(
        { is_active: action === 'ACTIVATE' },
        {
          onSuccess: () => {
            close();
            toast.success(action === 'ACTIVATE' ? 'User diaktifkan.' : 'User dinonaktifkan.');
          },
          onError: showError,
        },
      );
    }
  };

  const pending = resetPassword.isPending || revokeSessions.isPending || updateUser.isPending;
  const dialog = action ? ACTIONS[action] : null;

  return (
    <FormCard title="Zona aksi" description={SIGN_OUT_WARNING}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          className="h-11 bg-card"
          onClick={() => setAction('RESET')}
        >
          Reset password
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 bg-card"
          onClick={() => setAction('REVOKE')}
        >
          Cabut semua sesi
        </Button>
        {isSelf ? null : (
          <Button
            type="button"
            className={
              user.is_active
                ? 'h-11 border border-destructive/20 bg-danger-bg text-danger hover:bg-danger-bg/80'
                : 'h-11'
            }
            onClick={() => setAction(user.is_active ? 'DEACTIVATE' : 'ACTIVATE')}
          >
            {user.is_active ? 'Nonaktifkan user' : 'Aktifkan user'}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={dialog?.title ?? ''}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel ?? ''}
        tone={action === 'ACTIVATE' ? 'default' : 'destructive'}
        pending={pending}
        onConfirm={run}
      />
      <TemporaryPasswordDialog
        password={password}
        username={user.username}
        onClose={() => setPassword(null)}
      />
    </FormCard>
  );
}
