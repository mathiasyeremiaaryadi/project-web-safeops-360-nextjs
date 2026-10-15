'use client';

import { useEffect, useRef } from 'react';

/**
 * Image of a local file or blob (a photo not uploaded yet). Its object URL is revoked when the
 * blob changes or the image unmounts.
 * @param {{ blob: Blob, alt: string, className?: string }} props
 */
export function BlobImage({ blob, alt, className }) {
  const ref = useRef(/** @type {HTMLImageElement | null} */ (null));
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} alt={alt} className={className} />;
}
