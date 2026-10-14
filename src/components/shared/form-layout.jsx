import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * Titled card that groups form fields.
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 */
export function FormCard({ title, description, children, className }) {
  return (
    <section className={cn('rounded-2xl border bg-card p-5 sm:p-6', className)}>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Form-level error (server errors that do not belong to one field).
 * @param {{ message: string | null | undefined }} props
 */
export function FormAlert({ message }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 px-3.5 py-3">
      <CircleAlert aria-hidden="true" />
      <AlertDescription className="text-[15px] text-destructive sm:text-sm">
        {message}
      </AlertDescription>
    </Alert>
  );
}
