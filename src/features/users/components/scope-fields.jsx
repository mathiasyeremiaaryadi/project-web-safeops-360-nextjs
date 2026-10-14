'use client';

import { Controller, useWatch } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { ROLES } from '@/lib/constants';
import { VENDOR_SCOPED_ROLES } from '@/features/users/constants';

/**
 * Vendor (single, Admin Worker/Worker) and Site (multiple, Admin) pickers. Each field is
 * enabled and required only for the roles that need it (FR-18).
 * @param {{ control: import('react-hook-form').Control<any>, disabled?: boolean }} props
 */
export function ScopeFields({ control, disabled = false }) {
  const roles = /** @type {string[]} */ (useWatch({ control, name: 'roles' }) ?? []);
  const needsVendor = roles.some((role) => VENDOR_SCOPED_ROLES.includes(role));
  const needsSites = roles.includes(ROLES.ADMIN);
  const superAdminOnly = roles.length > 0 && roles.every((role) => role === ROLES.SUPER_ADMIN);

  if (superAdminOnly) {
    return (
      <p className="text-sm text-muted-foreground">
        Super Admin tidak memakai scope: aksesnya semua site dan vendor.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Controller
        control={control}
        name="vendor"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="scope-vendor"
              className={needsVendor ? undefined : 'text-muted-foreground'}
            >
              Vendor
            </Label>
            <AsyncCombobox
              id="scope-vendor"
              lookup="vendors"
              value={needsVendor ? field.value : null}
              onChange={field.onChange}
              placeholder={needsVendor ? 'Pilih vendor' : 'Hanya untuk Admin Worker / Worker'}
              disabled={disabled || !needsVendor}
              invalid={Boolean(fieldState.error)}
              describedBy={fieldState.error ? 'scope-vendor-error' : undefined}
            />
            {fieldState.error ? (
              <p id="scope-vendor-error" className="text-sm text-destructive">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        )}
      />
      <Controller
        control={control}
        name="sites"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="scope-sites"
              className={needsSites ? undefined : 'text-muted-foreground'}
            >
              Site
            </Label>
            <AsyncCombobox
              id="scope-sites"
              lookup="sites"
              multiple
              value={needsSites ? field.value : []}
              onChange={field.onChange}
              placeholder={needsSites ? 'Pilih site' : 'Hanya untuk role Admin'}
              disabled={disabled || !needsSites}
              invalid={Boolean(fieldState.error)}
              describedBy={fieldState.error ? 'scope-sites-error' : undefined}
            />
            {fieldState.error ? (
              <p id="scope-sites-error" className="text-sm text-destructive">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
