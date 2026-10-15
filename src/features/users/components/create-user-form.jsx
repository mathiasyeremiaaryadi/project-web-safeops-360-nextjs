'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { StickyActionBar } from '@/components/layout/sticky-action-bar';
import { FormAlert, FormCard } from '@/components/shared/form-layout';
import { useSiteContext } from '@/hooks/use-site-context';
import { useVendorField } from '@/hooks/use-vendor-field';
import { getErrorMessage } from '@/lib/api/errors';
import { can } from '@/lib/auth/permissions';
import { ROLES } from '@/lib/constants';
import { useSession } from '@/features/auth';
import { useCreateUser } from '@/features/users/api/mutations';
import { createUserFormSchema, toCreateUserPayload } from '@/features/users/api/schemas';
import { AccessSummary } from '@/features/users/components/access-summary';
import { ProfileFields } from '@/features/users/components/profile-fields';
import { CreateUserAccess, WorkerAccessNote } from '@/features/users/components/create-user-access';
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

/** Save errors of an Admin vendor (the role is locked in the UI, so this should not happen). */
const WORKER_ONLY_ERRORS = Object.freeze({ 403: 'Admin vendor hanya bisa membuat akun Worker.' });

/**
 * "Tambah user" form (`/users/new`). Super Admin chooses roles and scope; an Admin vendor only
 * creates Worker accounts of their own vendor (role locked, vendor filled in).
 */
export function CreateUserForm() {
  const router = useRouter();
  const createUser = useCreateUser();
  const { user: currentUser } = useSession();
  const manageAccess = can(currentUser, 'USER_ACCESS_ADMIN');
  const vendorField = useVendorField();
  const site = useSiteContext();
  const [created, setCreated] = useState(
    /** @type {{ id: string, username: string, password: string } | null} */ (null),
  );
  const form = useForm({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: manageAccess
      ? DEFAULT_VALUES
      : { ...DEFAULT_VALUES, roles: [ROLES.WORKER], vendor: vendorField.defaultValue },
  });

  const onSubmit = form.handleSubmit((values) => {
    createUser.mutate(vendorField.complete(toCreateUserPayload(values)), {
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
      ? getErrorMessage(createUser.error, manageAccess ? {} : WORKER_ONLY_ERRORS)
      : null;

  return (
    <div
      className={
        manageAccess
          ? 'grid gap-5 xl:grid-cols-[1fr_300px] xl:items-start'
          : 'grid gap-5 lg:max-w-3xl'
      }
    >
      <form
        method="post"
        noValidate
        onSubmit={onSubmit}
        aria-busy={createUser.isPending}
        className="flex min-w-0 flex-col gap-4"
      >
        <FormCard title="Data akun">
          <ProfileFields form={form} withUsername />
        </FormCard>

        {manageAccess ? (
          <CreateUserAccess control={form.control} />
        ) : (
          <WorkerAccessNote vendorName={site.shortLabel} />
        )}

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

      {manageAccess ? (
        <div className="hidden xl:sticky xl:top-24 xl:block">
          <AccessSummary control={form.control} />
        </div>
      ) : null}

      <TemporaryPasswordDialog
        password={created?.password ?? null}
        username={created?.username ?? ''}
        onClose={() => router.push(created ? `/users/${created.id}` : '/users')}
      />
    </div>
  );
}
