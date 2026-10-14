'use client';

import { Input } from '@/components/ui/input';
import { FormField, getFieldA11yProps } from '@/components/shared/form-field';
import { USERNAME_HINT } from '@/features/users/constants';

/**
 * Name, (username), email and phone fields.
 * @param {object} props
 * @param {import('react-hook-form').UseFormReturn<any>} props.form
 * @param {boolean} [props.withUsername] Only when creating — usernames cannot change later.
 */
export function ProfileFields({ form, withUsername = false }) {
  const {
    register,
    formState: { errors },
  } = form;
  /** @param {string} name */
  const errorOf = (name) => /** @type {string | undefined} */ (errors[name]?.message);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="full_name" label="Nama lengkap" error={errorOf('full_name')}>
        <Input
          {...register('full_name')}
          {...getFieldA11yProps('full_name', errorOf('full_name'))}
          autoComplete="off"
        />
      </FormField>

      {withUsername ? (
        <FormField id="username" label="Username" error={errorOf('username')}>
          <Input
            {...register('username')}
            {...getFieldA11yProps('username', errorOf('username'), 'username-hint')}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="font-mono"
          />
          <p id="username-hint" className="pt-1.5 text-xs text-muted-foreground">
            {USERNAME_HINT}
          </p>
        </FormField>
      ) : null}

      <FormField id="email" label="Email (opsional)" error={errorOf('email')}>
        <Input
          {...register('email')}
          {...getFieldA11yProps('email', errorOf('email'))}
          type="email"
          inputMode="email"
          placeholder="nama@perusahaan.co.id"
          autoComplete="off"
        />
      </FormField>

      <FormField id="phone" label="No. HP (opsional)" error={errorOf('phone')}>
        <Input
          {...register('phone')}
          {...getFieldA11yProps('phone', errorOf('phone'))}
          type="tel"
          inputMode="tel"
          placeholder="08xx"
          autoComplete="off"
        />
      </FormField>
    </div>
  );
}
