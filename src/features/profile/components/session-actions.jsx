'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useLogout, useLogoutAll, useSession } from '@/features/auth';
import { countPendingUploads } from '@/features/offline';

/**
 * Sign-out actions. The list of active sessions is not shown: the backend has no endpoint to
 * list sessions (docs/ASSUMPTIONS.md).
 */
export function SessionActions() {
  const logoutMutation = useLogout();
  const logoutAllMutation = useLogoutAll();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { user } = useSession();
  // Photos still queued on this device (Worker): logging out deletes them, so ask first.
  const [pendingUploads, setPendingUploads] = useState(0);

  const startLogout = async () => {
    const pending = user ? await countPendingUploads(user.id).catch(() => 0) : 0;
    if (pending > 0) setPendingUploads(pending);
    else logoutMutation.mutate();
  };

  const logoutEverywhere = () => {
    logoutAllMutation.mutate(undefined, {
      onError: () => toast.error('Gagal keluar dari semua perangkat. Coba lagi.'),
    });
  };

  return (
    <section aria-labelledby="session-title" className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 id="session-title" className="text-lg font-semibold text-foreground">
        Sesi
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Keluar dari perangkat ini, atau dari semua perangkat yang memakai akun Anda.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 bg-card text-base"
          disabled={logoutMutation.isPending}
          onClick={startLogout}
        >
          <LogOut aria-hidden="true" className="size-4" />
          Keluar
        </Button>
        <Button
          type="button"
          className="h-11 border border-destructive/20 bg-danger-bg text-base font-semibold text-danger hover:bg-danger-bg/80"
          onClick={() => setConfirmOpen(true)}
        >
          Keluar dari semua perangkat
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Keluar dari semua perangkat?"
        description="Semua sesi akun Anda, termasuk di perangkat ini, akan diakhiri."
        confirmLabel="Keluar dari semua perangkat"
        tone="destructive"
        pending={logoutAllMutation.isPending}
        onConfirm={logoutEverywhere}
      />
      <ConfirmDialog
        open={pendingUploads > 0}
        onOpenChange={(open) => {
          if (!open) setPendingUploads(0);
        }}
        title="Foto belum terkirim"
        description={`${pendingUploads} foto belum terkirim dan akan dihapus jika Anda keluar. Tetap keluar?`}
        confirmLabel="Tetap keluar"
        tone="destructive"
        pending={logoutMutation.isPending}
        onConfirm={() => logoutMutation.mutate()}
      />
    </section>
  );
}
