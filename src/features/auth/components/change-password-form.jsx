'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExpandableMessage } from '@/components/shared/expandable-message';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { changePasswordFormSchema, evaluatePasswordRules } from '@/features/auth/api/schemas';
import { ChangePasswordIntro } from '@/features/auth/components/change-password-intro';
import { PasswordInput } from '@/features/auth/components/password-input';
import { PasswordRules } from '@/features/auth/components/password-rules';
import { useChangePassword } from '@/features/auth/hooks/use-change-password';
import { useSession } from '@/features/auth/hooks/use-session';
import { getChangePasswordError } from '@/features/auth/lib/error-messages';

const DIFFERENT_PASSWORD_MESSAGE = 'Password baru harus berbeda dari password lama';
const FORM_ERROR_ID = 'change-password-error';

/**
 * Change-password form.
 * - default: the stand-alone "Buat password baru" page (`/change-password`);
 * - `embedded`: the "Ganti password" card on the profile page.
 * @param {{ embedded?: boolean }} props
 */
export function ChangePasswordForm({ embedded = false }) {
  const { user } = useSession();
  const mustChange = user?.must_change_password === true;
  const changePasswordMutation = useChangePassword();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordFormSchema),
    mode: 'onTouched',
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });

  const [currentPassword, newPassword, confirmPassword] = useWatch({
    control,
    name: ['current_password', 'new_password', 'confirm_password'],
  });
  const rules = evaluatePasswordRules(newPassword ?? '', confirmPassword ?? '');
  const allRulesMet = Object.values(rules).every(Boolean) && Boolean(currentPassword);

  const apiError =
    changePasswordMutation.isError && changePasswordMutation.error?.status !== 401
      ? getChangePasswordError(changePasswordMutation.error)
      : null;
  const formError = apiError && apiError.field === null ? apiError.message : null;

  const onSubmit = handleSubmit((values) => {
    changePasswordMutation.mutate(values, {
      onError: (error) => {
        // 401: the BFF could not restore the session; the API client already redirects to login.
        if (error?.status === 401) return;
        const { field, message } = getChangePasswordError(error);
        if (field) {
          setError(field, { type: 'server', message }, { shouldFocus: true });
        } else {
          // Move focus to the form-level message so screen readers announce it.
          requestAnimationFrame(() => document.getElementById(FORM_ERROR_ID)?.focus());
        }
      },
    });
  });

  const isPending = changePasswordMutation.isPending;
  const submitLabel = embedded ? 'Simpan password' : 'Simpan dan lanjutkan';
  const currentPasswordError =
    errors.current_password?.type === 'server' ? errors.current_password.message : undefined;
  const currentLabel = mustChange ? 'Password sementara' : 'Password saat ini';
  // The checklist explains length/letter/digit/match; only the "different" rule is repeated.
  const newPasswordError =
    errors.new_password?.message === DIFFERENT_PASSWORD_MESSAGE
      ? errors.new_password.message
      : undefined;
  const confirmError =
    errors.confirm_password?.message && confirmPassword
      ? errors.confirm_password.message
      : undefined;

  return (
    <div>
      {embedded ? (
        <h2 className="text-lg font-semibold text-foreground">Ganti password</h2>
      ) : (
        <ChangePasswordIntro mustChange={mustChange} username={user?.username} />
      )}

      <form
        noValidate
        onSubmit={onSubmit}
        aria-busy={isPending}
        className={embedded ? 'mt-4 flex flex-col' : 'mt-6 flex flex-col'}
      >
        {/* Hidden username helps password managers associate the new password. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={user?.username ?? ''}
          readOnly
          hidden
        />

        <FormField id="current_password" label={currentLabel} error={currentPasswordError}>
          <PasswordInput
            {...register('current_password')}
            {...getFieldA11yProps('current_password', currentPasswordError)}
            autoComplete="current-password"
          />
        </FormField>

        <FormField
          id="new_password"
          label="Password baru"
          error={newPasswordError}
          className="mt-4"
        >
          <PasswordInput
            {...register('new_password')}
            {...getFieldA11yProps('new_password', newPasswordError, 'password-rules')}
            autoComplete="new-password"
          />
        </FormField>

        <FormField
          id="confirm_password"
          label="Ulangi password baru"
          error={confirmError}
          className="mt-4"
        >
          <PasswordInput
            {...register('confirm_password')}
            {...getFieldA11yProps('confirm_password', confirmError, 'password-rules')}
            autoComplete="new-password"
          />
        </FormField>

        <div className="mt-5">
          <PasswordRules id="password-rules" rules={rules} />
        </div>

        {embedded ? (
          <p className="mt-4 rounded-lg bg-warning-bg px-3.5 py-3 text-sm text-warning">
            Setelah password diganti, semua perangkat lain akan otomatis keluar.
          </p>
        ) : null}

        <ExpandableMessage show={Boolean(formError)}>
          <div className="pt-4">
            <Alert
              id={FORM_ERROR_ID}
              tabIndex={-1}
              variant="destructive"
              className="border-destructive/30 bg-destructive/5 px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CircleAlert aria-hidden="true" />
              <AlertDescription className="text-[15px] text-destructive sm:text-sm">
                {formError}
              </AlertDescription>
            </Alert>
          </div>
        </ExpandableMessage>

        <Button
          type="submit"
          disabled={!allRulesMet || isPending}
          className="mt-6 h-12 w-full text-base font-semibold sm:mt-5"
        >
          {isPending ? (
            <>
              <Loader2 aria-hidden="true" className="size-5 animate-spin" />
              Menyimpan…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </div>
  );
}
