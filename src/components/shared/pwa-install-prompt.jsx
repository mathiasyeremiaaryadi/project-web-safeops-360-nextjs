'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppLogo } from '@/components/shared/app-logo';
import { usePwaInstall } from '@/hooks/use-pwa-install';

/** Install steps when the browser does not offer its own dialog. */
const STEPS = Object.freeze({
  ios: [
    'Buka halaman ini di Safari.',
    'Ketuk tombol Bagikan (kotak dengan panah ke atas).',
    'Pilih "Tambah ke Layar Utama", lalu ketuk "Tambah".',
  ],
  android: [
    'Buka halaman ini di Chrome.',
    'Ketuk menu ⋮ di kanan atas.',
    'Pilih "Instal aplikasi" atau "Tambahkan ke layar utama".',
  ],
  desktop: [
    'Buka halaman ini di Chrome atau Edge.',
    'Klik ikon instal di ujung kanan kolom alamat, atau menu ⋮.',
    'Pilih "Instal SafeOps 360".',
  ],
});

/**
 * "Pasang aplikasi" on the login page. With the browser's install dialog (`beforeinstallprompt`)
 * the button opens it, and on phones a bottom sheet invites once (until "Nanti", 7 days).
 * Otherwise — iOS, or a page not served over HTTPS — the button shows the steps for the device.
 * Hidden once the app runs installed.
 */
export function PwaInstallPrompt() {
  const { installed, canPrompt, showInvite, platform, secure, install, dismiss } = usePwaInstall();
  const [helpOpen, setHelpOpen] = useState(false);
  if (installed) return null;

  const onInstall = () => (canPrompt ? install() : setHelpOpen(true));

  return (
    <>
      {showInvite ? (
        // XS: bottom sheet
        <section
          aria-labelledby="pwa-sheet-title"
          aria-describedby="pwa-sheet-description"
          className="fixed inset-x-0 bottom-0 z-40 animate-in rounded-t-[20px] bg-card px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_-8px_color-mix(in_srgb,var(--brand-dark)_25%,transparent)] fade-in-0 slide-in-from-bottom-8 sm:hidden"
        >
          <div aria-hidden="true" className="mx-auto mb-5 h-1 w-10 rounded-full bg-input" />
          <div className="flex items-start gap-4">
            <AppLogo size={52} tone="dark" />
            <div className="min-w-0">
              <h2 id="pwa-sheet-title" className="text-lg font-semibold text-foreground">
                Pasang SafeOps 360
              </h2>
              <p
                id="pwa-sheet-description"
                className="mt-0.5 text-[15px] leading-snug text-muted-foreground"
              >
                Buka langsung dari layar utama, tetap bisa melihat tugas saat sinyal hilang.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 bg-card text-base font-semibold"
              onClick={dismiss}
            >
              Nanti
            </Button>
            <Button
              type="button"
              className="h-12 bg-brand-dark text-base font-semibold text-brand-dark-foreground hover:bg-brand-dark/90"
              onClick={install}
            >
              Pasang
            </Button>
          </div>
        </section>
      ) : null}

      {/* Always available, every screen size */}
      <div className="mt-6 flex items-center gap-3 border-t pt-5">
        <Download aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        <p className="flex-1 text-sm text-muted-foreground">
          Pasang SafeOps 360 sebagai aplikasi di perangkat ini.
        </p>
        <Button type="button" variant="outline" className="h-11 bg-card px-4" onClick={onInstall}>
          Pasang aplikasi
        </Button>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pasang SafeOps 360</DialogTitle>
            <DialogDescription>Ikuti langkah berikut di perangkat ini.</DialogDescription>
          </DialogHeader>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px] text-foreground">
            {STEPS[platform].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {!secure ? (
            <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
              Halaman ini belum memakai HTTPS, jadi browser hanya bisa menambahkan pintasan ke layar
              utama. Aplikasi penuh (termasuk mode offline) butuh alamat HTTPS.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
