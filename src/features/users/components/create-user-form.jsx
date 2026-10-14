'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { StickyActionBar } from '@/components/layout/sticky-action-bar';
import { FormAlert, FormCard } from '@/components/shared/form-layout';
import { getErrorMessage } from '@/lib/api/errors';
import { useCreateUser } from '@/features/users/api/mutations';
import { createUserFormSchema, toCreateUserPayload } from '@/features/users/api/schemas';
import { AccessSummary } from '@/features/users/components/access-summary';
import { ProfileFields } from '@/features/users/components/profile-fields';
import { RoleCheckboxGroup } from '@/features/users/components/role-checkbox-group';
import { ScopeFields } from '@/features/users/components/scope-fields';
import { TemporaryPasswordDialog } from '@/features/users/components/temporary-password-dialog';

const DEFAULT_VALUES = {
  full_name: '',
  username: '',
  email: '',
  phone: '',
  roles: [],
  sites: [],
  vendor: null,
};

/** "Tambah user" form (`/users/new`). */
export function CreateUserForm() {
  const router = useRouter();
  const createUser = useCreateUser();
  const [created, setCreated] = useState(
    /** @type {{ id: string, username: string, password: string } | null} */ (null),
  );
  const form = useForm({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit((values) => {
    createUser.mutate(toCreateUserPayload(values), {
      onSuccess: ({ user, temporary_password: password }) => {
        toast.success('User berhasil disimpan.');
        if (password) setCreated({ id: user.id, username: user.username, password });
        else router.push(`/users/${user.id}`);
      },
      onError: (error) => {
        if (/** @type {any} */ (error).status === 409) {
          form.setError('username', { message: 'Username sudah dipakai.' }, { shouldFocus: true });
        }
      },
    });
  });

  const formError =
    createUser.isError && /** @type {any} */ (createUser.error).status !== 409
      ? getErrorMessage(createUser.error)
      : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_300px] xl:items-start">
      <form
        method="post"
        noValidate
        onSubmit={onSubmit}
        aria-busy={createUser.isPending}
        className="flex flex-col gap-4"
      >
        <FormCard title="Data akun">
          <ProfileFields form={form} withUsername />
        </FormCard>

        <FormCard title="Role" description="Boleh lebih dari satu role.">
          <Controller
            control={form.control}
            name="roles"
            render={({ field, fieldState }) => (
              <RoleCheckboxGroup
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </FormCard>

        <FormCard
          title="Scope data"
          description="Worker dan Admin Worker wajib tepat satu vendor. Admin wajib minimal satu site."
        >
          <ScopeFields control={form.control} />
        </FormCard>

        <FormCard title="Password sementara">
          <p className="text-sm text-muted-foreground">
            Dibuat otomatis oleh sistem dan ditampilkan sekali setelah user disimpan. User wajib
            menggantinya saat login pertama.
          </p>
        </FormCard>

        <FormAlert message={formError} />

        <StickyActionBar>
          <Link
            href="/users"
            className={buttonVariants({ variant: 'outline', className: 'h-12 bg-card md:h-11' })}
          >
            Batal
          </Link>
          <Button
            type="submit"
            disabled={createUser.isPending}
            className="h-12 font-semibold md:h-11"
          >
            {createUser.isPending ? 'Menyimpan…' : 'Simpan user'}
          </Button>
        </StickyActionBar>
      </form>

      <div className="hidden xl:sticky xl:top-24 xl:block">
        <AccessSummary control={form.control} />
      </div>

      <TemporaryPasswordDialog
        password={created?.password ?? null}
        username={created?.username ?? ''}
        onClose={() => router.push(created ? `/users/${created.id}` : '/users')}
      />
    </div>
  );
}
