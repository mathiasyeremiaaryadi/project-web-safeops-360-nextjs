'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { ROLE_OPTIONS } from '@/features/users/constants';
import { cn } from '@/lib/utils';

/**
 * Role cards (multiple roles allowed).
 * @param {object} props
 * @param {string[]} props.value
 * @param {(roles: string[]) => void} props.onChange
 * @param {string} [props.error]
 * @param {boolean} [props.disabled]
 */
export function RoleCheckboxGroup({ value, onChange, error, disabled = false }) {
  /** @param {string} role @param {boolean} checked */
  const toggle = (role, checked) =>
    onChange(checked ? [...value, role] : value.filter((item) => item !== role));

  return (
    <fieldset aria-describedby={error ? 'roles-error' : undefined}>
      <legend className="sr-only">Role</legend>
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {ROLE_OPTIONS.map((role) => {
          const checked = value.includes(role.value);
          const id = `role-${role.value}`;
          return (
            <label
              key={role.value}
              htmlFor={id}
              className={cn(
                'flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                checked && 'border-primary bg-info-bg/40',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={(next) => toggle(role.value, next === true)}
                className="mt-0.5 size-5"
              />
              <span>
                <span className="block font-semibold text-foreground">{role.label}</span>
                <span className="block text-sm text-muted-foreground">{role.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id="roles-error" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
