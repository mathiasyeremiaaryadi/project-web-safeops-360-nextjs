import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Live checklist of the new-password rules.
 * @param {object} props
 * @param {{ minLength: boolean, hasLetter: boolean, hasDigit: boolean, matches: boolean }} props.rules
 *   Result of `evaluatePasswordRules()`.
 * @param {string} [props.id]
 */
export function PasswordRules({ rules, id }) {
  const items = [
    { key: 'minLength', label: 'Minimal 8 karakter', met: rules.minLength },
    { key: 'hasLetter', label: 'Mengandung huruf', met: rules.hasLetter },
    { key: 'hasDigit', label: 'Mengandung angka', met: rules.hasDigit },
    { key: 'matches', label: 'Password baru cocok', met: rules.matches },
  ];

  return (
    <ul
      id={id}
      aria-live="polite"
      aria-label="Aturan password"
      className="flex flex-col gap-2 rounded-[10px] border bg-background px-4 py-3.5"
    >
      {items.map((item) => (
        <li
          key={item.key}
          data-met={item.met}
          className={cn(
            'flex items-center gap-3 text-[15px] sm:text-sm',
            item.met ? 'text-success' : 'text-muted-foreground',
          )}
        >
          {item.met ? (
            <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.5} />
          ) : (
            <Circle aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
          )}
          <span>
            {item.label}
            <span className="sr-only">{item.met ? ' (terpenuhi)' : ' (belum terpenuhi)'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
