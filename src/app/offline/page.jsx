import { WifiOff } from 'lucide-react';

export const metadata = {
  title: 'Offline',
};

/** Fallback served by the service worker when a page cannot be loaded offline. */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <WifiOff className="size-6" />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-foreground">Anda sedang offline</h1>
      <p className="mt-2 max-w-sm text-base text-muted-foreground">
        Halaman ini belum bisa dimuat. Periksa koneksi internet Anda, lalu coba lagi.
      </p>
    </main>
  );
}
