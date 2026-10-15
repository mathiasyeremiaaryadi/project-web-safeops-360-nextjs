'use client';

import { useId } from 'react';
import { Camera, CloudOff, Loader2 } from 'lucide-react';
import { BlobImage } from '@/components/shared/blob-image';
import { SignedImage } from '@/components/shared/signed-image';
import { cn } from '@/lib/utils';
import { EVIDENCE_LABELS } from '@/features/task-report/lib/report-state';

/** Overlay badge per local photo state. */
const STATE_BADGES = Object.freeze({
  uploading: { icon: Loader2, label: 'Mengunggah…', className: 'bg-card/90 text-foreground' },
  waiting: { icon: CloudOff, label: 'Menunggu sinyal', className: 'bg-warning-bg text-warning' },
  failed: { icon: CloudOff, label: 'Gagal dikirim', className: 'bg-danger-bg text-danger' },
});

/**
 * One evidence photo: an empty "Ambil foto …" button that opens the camera, or the photo with
 * "Ganti". A photo not on the server yet shows the local image with its state.
 * @param {object} props
 * @param {'before' | 'after'} props.type
 * @param {string | null | undefined} props.url Photo on the server (signed URL or object key).
 * @param {string | null} [props.time] "07.42" — when the photo was taken (open/close time).
 * @param {Blob | null} [props.preview] Local photo (uploading or queued offline).
 * @param {keyof typeof STATE_BADGES | null} [props.state]
 * @param {boolean} props.editable
 * @param {string | null} [props.lockedReason] Why it cannot be taken yet ("after" before "before").
 * @param {(file: File) => void} props.onPick
 * @param {import('react').ReactNode} [props.extra] e.g. "Coba lagi" for a failed upload.
 */
export function EvidenceSlot({
  type,
  url,
  time,
  preview,
  state,
  editable,
  lockedReason,
  onPick,
  extra,
}) {
  const id = useId();
  const label = EVIDENCE_LABELS[type];
  const hasPhoto = Boolean(preview || url);
  const disabled = !editable || Boolean(lockedReason) || state === 'uploading';
  const badge = state ? STATE_BADGES[state] : null;

  return (
    <figure className="flex min-w-0 flex-col gap-2 rounded-xl outline-offset-4 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-ring">
      {hasPhoto ? (
        <div className="relative">
          {preview ? (
            <BlobImage
              blob={preview}
              alt={`Foto ${label.toLowerCase()}`}
              className="aspect-[4/3] w-full rounded-xl bg-muted object-cover"
            />
          ) : (
            <SignedImage
              url={url}
              alt={`Foto ${label.toLowerCase()}`}
              placeholder="Foto tersimpan"
              className="aspect-[4/3] w-full rounded-xl"
            />
          )}
          {badge ? (
            <span
              className={cn(
                'absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
                badge.className,
              )}
            >
              <badge.icon
                aria-hidden="true"
                className={cn('size-3.5', state === 'uploading' && 'animate-spin')}
              />
              {badge.label}
            </span>
          ) : null}
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            'flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/40 p-2 text-center text-sm font-semibold text-foreground',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted',
          )}
        >
          <Camera aria-hidden="true" className="size-7 text-muted-foreground" />
          {editable ? `Ambil foto ${label.toLowerCase()}` : 'Belum ada foto'}
        </label>
      )}
      {editable ? (
        <input
          id={id}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label={`${hasPhoto ? 'Ganti' : 'Ambil'} foto ${label.toLowerCase()}`}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onPick(file);
          }}
        />
      ) : null}
      <figcaption className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {label}
          {time ? ` · ${time}` : ''}
        </span>
        {hasPhoto && editable && !disabled ? (
          <label htmlFor={id} className="cursor-pointer font-semibold text-primary hover:underline">
            Ganti
          </label>
        ) : null}
      </figcaption>
      {editable && lockedReason && !hasPhoto ? (
        <p className="text-xs text-muted-foreground">{lockedReason}</p>
      ) : null}
      {extra}
    </figure>
  );
}
