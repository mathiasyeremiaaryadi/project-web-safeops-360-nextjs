'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * `value` when it is an http(s) URL, else `null`. Report evidence may only be an object key
 * (no signed URL endpoint yet — docs/ASSUMPTIONS.md G3), which cannot be displayed.
 * @param {unknown} value
 */
export function asImageUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;
}

/**
 * Image from a signed URL (object storage), or a placeholder when there is none or it fails to
 * load (expired link, storage down). A plain <img>: signed URLs change on every request, so the
 * Next.js image optimizer would only add a cache miss.
 * @param {object} props
 * @param {string | null | undefined} props.url
 * @param {string} props.alt
 * @param {string} [props.className]
 * @param {import('lucide-react').LucideIcon} [props.icon] Placeholder icon.
 * @param {string} [props.placeholder] Visible placeholder text (large images).
 */
export function SignedImage({ url, alt, className, icon: Icon = ImageOff, placeholder }) {
  const [failedUrl, setFailedUrl] = useState(/** @type {string | null} */ (null));
  const src = asImageUrl(url);

  if (!src || failedUrl === src) {
    return (
      <span
        className={cn(
          'flex shrink-0 flex-col items-center justify-center gap-2 rounded-lg bg-muted p-2 text-center text-muted-foreground',
          className,
        )}
      >
        <Icon aria-hidden="true" className="size-1/2 max-h-10 max-w-10" />
        {placeholder ? <span className="text-sm">{placeholder}</span> : null}
        <span className="sr-only">{alt ? `Tidak ada foto ${alt}` : 'Tidak ada foto'}</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedUrl(src)}
      className={cn('shrink-0 rounded-lg bg-muted object-cover', className)}
    />
  );
}
