'use client';

import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { copyText } from '@/lib/clipboard';

/**
 * Shows a temporary password exactly once (it is not stored anywhere in the app).
 * @param {object} props
 * @param {string | null} props.password `null` closes the dialog.
 * @param {string} props.username
 * @param {() => void} props.onClose
 */
export function TemporaryPasswordDialog({ password, username, onClose }) {
  const [copied, setCopied] = useState(false);
  const passwordRef = useRef(/** @type {HTMLOutputElement | null} */ (null));

  const copy = async () => {
    if (!password) return;
    const output = passwordRef.current;
    const ok = await copyText(password, output?.parentElement ?? undefined);
    setCopied(ok);
    if (ok) return;
    // Let the admin copy it by hand: select the password.
    if (output) window.getSelection()?.selectAllChildren(output);
    toast.error('Gagal menyalin otomatis. Password sudah diblok, salin manual (Ctrl+C).');
  };

  return (
    <Dialog open={Boolean(password)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Password sementara</DialogTitle>
          <DialogDescription>
            Berikan ke <span className="font-mono">{username}</span> secara langsung. User wajib
            menggantinya saat login pertama.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <output
            ref={passwordRef}
            aria-label="Password sementara"
            className="flex h-11 min-w-0 flex-1 items-center rounded-lg border bg-muted px-3.5 font-mono text-base break-all select-all"
          >
            {password}
          </output>
          <Button type="button" variant="outline" className="h-11 bg-card" onClick={copy}>
            {copied ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {copied ? 'Tersalin' : 'Salin'}
          </Button>
        </div>
        <p role="note" className="rounded-lg bg-warning-bg px-3.5 py-3 text-sm text-warning">
          Password ini hanya ditampilkan sekali.
        </p>
        <DialogFooter>
          <Button type="button" className="h-11" onClick={onClose}>
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
