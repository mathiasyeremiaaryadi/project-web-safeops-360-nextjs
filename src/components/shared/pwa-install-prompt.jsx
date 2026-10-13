'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/shared/app-logo';
import { usePwaInstall } from '@/hooks/use-pwa-install';

/**
 * Invitation to install the PWA. Rendered only after `beforeinstallprompt` fired, when the app
 * is not installed and "Nanti" was not chosen in the last 7 days.
 * XS: bottom sheet. SM+: inline row below the form.
 */
export function PwaInstallPrompt() {
  const { canInstall, install, dismiss } = usePwaInstall();
  if (!canInstall) return null;

  return (
    <>
      {/* XS: bottom sheet */}
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

      {/* SM+: inline row */}
      <div className="mt-6 hidden items-center gap-3 border-t pt-5 sm:flex">
        <Download aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        <p className="flex-1 text-sm text-muted-foreground">
          Pasang SafeOps 360 sebagai aplikasi di perangkat ini.
        </p>
        <Button type="button" variant="outline" className="h-11 bg-card px-4" onClick={install}>
          Pasang
        </Button>
      </div>
    </>
  );
}
