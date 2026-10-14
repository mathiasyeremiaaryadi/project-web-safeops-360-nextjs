import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholder for a list.
 * @param {{ rows?: number, label?: string }} props
 */
export function ListSkeleton({ rows = 5, label = 'Memuat data' }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

/**
 * Error with a retry button.
 * @param {{ title?: string, description?: string, onRetry?: () => void }} props
 */
export function ErrorState({
  title = 'Data gagal dimuat.',
  description = 'Periksa koneksi Anda, lalu coba lagi.',
  onRetry,
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border bg-card px-6 py-12 text-center"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-xl bg-danger-bg text-danger"
      >
        <AlertTriangle className="size-6" />
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-5 h-11 bg-card" onClick={onRetry}>
          <RotateCw aria-hidden="true" className="size-4" />
          Coba lagi
        </Button>
      ) : null}
    </div>
  );
}
