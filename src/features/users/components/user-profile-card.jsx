'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormAlert, FormCard } from '@/components/shared/form-layout';
import { getErrorMessage } from '@/lib/api/errors';
import { useUpdateUser } from '@/features/users/api/mutations';
import { profileFormSchema } from '@/features/users/api/schemas';
import { ProfileFields } from '@/features/users/components/profile-fields';

/**
 * "Data akun" of the detail page (`PATCH /users/{id}`). The username cannot be changed.
 * @param {{ user: import('@/features/users/api/schemas').User }} props
 */
export function UserProfileCard({ user }) {
  const updateUser = useUpdateUser(user.id);
  const form = useForm({
    resolver: zodResolver(profileFormSchema),
    values: { full_name: user.full_name ?? '', email: user.email ?? '', phone: user.phone ?? '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    updateUser.mutate(
      { full_name: values.full_name, email: values.email || null, phone: values.phone || null },
      { onSuccess: () => toast.success('Data akun berhasil disimpan.') },
    );
  });

  return (
    <FormCard title="Data akun">
      <form
        method="post"
        noValidate
        onSubmit={onSubmit}
        aria-busy={updateUser.isPending}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-muted-foreground">
          Username <span className="font-mono text-foreground">@{user.username}</span> tidak bisa
          diubah.
        </p>
        <ProfileFields form={form} />
        <FormAlert message={updateUser.isError ? getErrorMessage(updateUser.error) : null} />
        <div className="flex justify-end">
          <Button
            type="submit"
            className="h-11"
            disabled={updateUser.isPending || !form.formState.isDirty}
          >
            {updateUser.isPending ? 'Menyimpan…' : 'Simpan data akun'}
          </Button>
        </div>
      </form>
    </FormCard>
  );
}
