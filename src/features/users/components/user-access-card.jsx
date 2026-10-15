'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormAlert, FormCard } from '@/components/shared/form-layout';
import { getErrorMessage } from '@/lib/api/errors';
import { useUpdateUserAccess } from '@/features/users/api/mutations';
import { accessFormSchema, toAccessPayload } from '@/features/users/api/schemas';
import { RoleCheckboxGroup } from '@/features/users/components/role-checkbox-group';
import { ScopeFields } from '@/features/users/components/scope-fields';
import { SIGN_OUT_WARNING } from '@/features/users/constants';

/**
 * Role & scope of an existing user, saved in one `PUT /users/{id}/scopes` (roles + scopes).
 * @param {object} props
 * @param {import('@/features/users/api/schemas').User} props.user
 * @param {(id: string) => string} props.siteName
 * @param {(id: string) => string} props.vendorName
 */
export function UserAccessCard({ user, siteName, vendorName }) {
  const updateAccess = useUpdateUserAccess(user.id);
  const vendorId = user.scopes.vendor_ids[0];
  /** @param {string} id @param {(id: string) => string} lookup */
  const nameOf = (id, lookup) => user.scopes.names[id] ?? lookup(id);
  const form = useForm({
    resolver: zodResolver(accessFormSchema),
    defaultValues: {
      roles: user.roles,
      sites: user.scopes.site_ids.map((id) => ({ value: id, label: nameOf(id, siteName) })),
      vendor: vendorId ? { value: vendorId, label: nameOf(vendorId, vendorName) } : null,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    updateAccess.mutate(toAccessPayload(values), {
      onSuccess: () => {
        toast.success('Role dan scope berhasil disimpan.');
        form.reset(values);
      },
    });
  });

  return (
    <FormCard title="Role & scope" description={SIGN_OUT_WARNING}>
      <form
        method="post"
        noValidate
        onSubmit={onSubmit}
        aria-busy={updateAccess.isPending}
        className="flex flex-col gap-5"
      >
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
        <ScopeFields control={form.control} />
        <FormAlert message={updateAccess.isError ? getErrorMessage(updateAccess.error) : null} />
        <div className="flex justify-end">
          <Button
            type="submit"
            className="h-11"
            disabled={updateAccess.isPending || !form.formState.isDirty}
          >
            {updateAccess.isPending ? 'Menyimpan…' : 'Simpan role & scope'}
          </Button>
        </div>
      </form>
    </FormCard>
  );
}
