'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExpandableMessage } from '@/components/shared/expandable-message';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { loginFormSchema } from '@/features/auth/api/schemas';
import { PasswordInput } from '@/features/auth/components/password-input';
import { useLogin } from '@/features/auth/hooks/use-login';
import { useRedirectIfAuthenticated } from '@/features/auth/hooks/use-redirect-if-authenticated';
import { getLoginErrorMessage } from '@/features/auth/lib/error-messages';

/**
 * Username + password login form.
 * @param {object} props
 * @param {string | null} [props.next] Raw `?next=` value; validated before use.
 */
export function LoginForm({ next = null }) {
  useRedirectIfAuthenticated();
  const loginMutation = useLogin({ next });

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values, {
      onError: () => {
        // Keep the username, clear the password and let the user retype it.
        setValue('password', '');
        setFocus('password');
      },
    });
  });

  const isPending = loginMutation.isPending;
  const apiError = loginMutation.isError ? getLoginErrorMessage(loginMutation.error) : null;

  return (
    <form noValidate onSubmit={onSubmit} aria-busy={isPending} className="flex flex-col">
      <FormField id="username" label="Username" error={errors.username?.message}>
        <Input
          {...register('username')}
          {...getFieldA11yProps('username', errors.username?.message)}
          type="text"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono"
        />
      </FormField>

      <FormField id="password" label="Password" error={errors.password?.message} className="mt-4">
        <PasswordInput
          {...register('password')}
          {...getFieldA11yProps(
            'password',
            errors.password?.message,
            apiError ? 'login-error' : undefined,
          )}
          autoComplete="current-password"
        />
      </FormField>

      <ExpandableMessage show={Boolean(apiError)}>
        <div className="pt-4">
          <Alert
            id="login-error"
            variant="destructive"
            className="border-destructive/30 bg-destructive/5 px-3.5 py-3"
          >
            <CircleAlert aria-hidden="true" />
            <AlertDescription className="text-[15px] text-destructive sm:text-sm">
              {apiError}
            </AlertDescription>
          </Alert>
        </div>
      </ExpandableMessage>

      <Button
        type="submit"
        disabled={isPending}
        className="mt-6 h-12 w-full text-base font-semibold sm:mt-5"
      >
        {isPending ? (
          <>
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            Memproses…
          </>
        ) : (
          'Masuk'
        )}
      </Button>
    </form>
  );
}
