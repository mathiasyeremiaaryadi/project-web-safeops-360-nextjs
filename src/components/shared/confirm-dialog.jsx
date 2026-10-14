'use client';

import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Confirmation for actions that are hard to undo. Optionally asks for a required reason.
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string} props.title
 * @param {import('react').ReactNode} [props.description]
 * @param {string} props.confirmLabel
 * @param {'default' | 'destructive'} [props.tone]
 * @param {boolean} [props.pending]
 * @param {string} [props.reasonLabel] When set, a required reason textarea is shown.
 * @param {(reason: string) => void} props.onConfirm
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = 'default',
  pending = false,
  reasonLabel,
  onConfirm,
}) {
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const needsReason = Boolean(reasonLabel);
  const canConfirm = !pending && (!needsReason || reason.trim().length > 0);

  /** @param {boolean} next */
  const handleOpenChange = (next) => {
    if (!next) setReason('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {needsReason ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={reasonId}>{reasonLabel}</Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              required
              aria-required="true"
              className="text-base"
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => handleOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            className={
              tone === 'destructive'
                ? 'h-11 bg-destructive text-white hover:bg-destructive/90'
                : 'h-11'
            }
            disabled={!canConfirm}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {pending ? 'Memproses…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
