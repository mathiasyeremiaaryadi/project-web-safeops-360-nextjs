'use client';

import { Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { FormCard } from '@/components/shared/form-layout';
import { ROLE_LABELS, ROLES } from '@/lib/constants';
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
 * Access of an account created by a manager, whose role is fixed: an Admin vendor creates Workers
 * of their own vendor (no fields); an Admin creates Admin Workers and picks the vendor (only
 * vendors at their sites are listed).
 * @param {{ role: string, vendorName: string, control: import('react-hook-form').Control<any> }} props
 */
export function ManagedAccessFields({ role, vendorName, control }) {
  const roleLabel = ROLE_LABELS[/** @type {keyof typeof ROLE_LABELS} */ (role)] ?? role;
  if (role !== ROLES.ADMIN_WORKER) {
    return (
      <FormCard title="Akses">
        <p className="text-[15px] text-foreground sm:text-sm">
          Akun ini akan menjadi <strong>{roleLabel}</strong> di {vendorName}.
        </p>
      </FormCard>
    );
  }
  return (
    <FormCard title="Akses" description={`Akun ini akan menjadi ${roleLabel} untuk satu vendor.`}>
      <Controller
        control={control}
        name="vendor"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-2">
            <Label htmlFor="managed-vendor">Vendor</Label>
            <AsyncCombobox
              id="managed-vendor"
              lookup="vendors"
              value={field.value}
              onChange={field.onChange}
              placeholder="Pilih vendor"
              invalid={Boolean(fieldState.error)}
              describedBy={fieldState.error ? 'managed-vendor-error' : undefined}
            />
            {fieldState.error ? (
              <p id="managed-vendor-error" className="text-sm text-destructive">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        )}
      />
    </FormCard>
  );
}
