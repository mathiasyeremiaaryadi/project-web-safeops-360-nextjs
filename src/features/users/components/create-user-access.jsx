'use client';

import { Controller } from 'react-hook-form';
import { FormCard } from '@/components/shared/form-layout';
import { RoleCheckboxGroup } from '@/features/users/components/role-checkbox-group';
import { ScopeFields } from '@/features/users/components/scope-fields';

/**
 * Role and scope cards of the create form (Super Admin: any role, sites, vendor).
 * @param {{ control: import('react-hook-form').Control<any> }} props
 */
export function CreateUserAccess({ control }) {
  return (
    <>
      <FormCard title="Role" description="Boleh lebih dari satu role.">
        <Controller
          control={control}
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
        <ScopeFields control={control} />
      </FormCard>
    </>
  );
}

/**
 * Access of a Worker account created by an Admin vendor: fixed role, own vendor (no fields).
 * @param {{ vendorName: string }} props
 */
export function WorkerAccessNote({ vendorName }) {
  return (
    <FormCard title="Akses">
      <p className="text-[15px] text-foreground sm:text-sm">
        Akun ini akan menjadi <strong>Worker</strong> di {vendorName}.
      </p>
    </FormCard>
  );
}
