'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Inventory photo from its signed URL, or a placeholder icon when there is none or it fails to
 * load (expired link, storage down). A plain <img>: signed URLs change on every request, so the
 * Next.js image optimizer would only add a cache miss.
 * @param {{ url?: string | null, alt: string, className?: string }} props
 */
export function InventoryPhoto({ url, alt, className }) {
  const [failedUrl, setFailedUrl] = useState(/** @type {string | null} */ (null));

  if (!url || failedUrl === url) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground',
          className,
        )}
      >
        <Package aria-hidden="true" className="size-1/2 max-h-10 max-w-10" />
        <span className="sr-only">{alt ? `Tidak ada foto ${alt}` : 'Tidak ada foto'}</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailedUrl(url)}
      className={cn('shrink-0 rounded-lg bg-muted object-cover', className)}
    />
  );
}
