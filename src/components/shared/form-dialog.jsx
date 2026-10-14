'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormAlert } from '@/components/shared/form-layout';

/**
 * Create/edit form in a dialog. From 768px it is a centered dialog; below 768px the same
 * element becomes a bottom sheet (CSS only, no media-query hook).
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {(event: import('react').FormEvent) => void} props.onSubmit
 * @param {boolean} props.pending
 * @param {string | null} [props.error] Form-level error.
 * @param {string} [props.submitLabel]
 * @param {import('react').ReactNode} props.children Fields.
 */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  onSubmit,
  pending,
  error,
  submitLabel = 'Simpan',
  children,
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-5 max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-t-2xl max-md:rounded-b-none max-md:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          method="post"
          noValidate
          onSubmit={onSubmit}
          aria-busy={pending}
          className="flex flex-col gap-4"
        >
          {children}
          <FormAlert message={error} />
          <DialogFooter className="flex-row gap-3 *:flex-1 sm:*:flex-none">
            <Button type="button" variant="outline" className="h-11 bg-card" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="h-11 font-semibold" disabled={pending}>
              {pending ? 'Menyimpan…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
