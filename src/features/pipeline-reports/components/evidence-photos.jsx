import { SignedImage } from '@/components/shared/signed-image';

/**
 * Before/after photos side by side. Evidence may only be an object key without a signed URL
 * (docs/ASSUMPTIONS.md G3): then a placeholder is shown.
 * @param {{ beforeUrl?: string | null, afterUrl?: string | null }} props
 */
export function EvidencePhotos({ beforeUrl, afterUrl }) {
  const photos = [
    ['Sebelum', beforeUrl],
    ['Sesudah', afterUrl],
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map(([label, url]) => (
        <figure key={label} className="flex flex-col gap-1.5">
          <SignedImage
            url={url}
            alt={`Foto ${label.toLowerCase()}`}
            placeholder="Foto belum tersedia"
            className="aspect-[4/3] w-full"
          />
          <figcaption className="text-sm text-muted-foreground">{label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
