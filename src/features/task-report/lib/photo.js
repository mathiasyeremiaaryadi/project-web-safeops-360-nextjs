/*
 * Evidence photos are compressed in the browser before upload (or before being queued
 * offline): longest side 1600 px, JPEG quality 0.7, EXIF (GPS location) removed.
 */

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const COMPRESSION_OPTIONS = Object.freeze({
  maxWidthOrHeight: 1600,
  initialQuality: 0.7,
  fileType: 'image/jpeg',
  preserveExif: false,
  // The library's web worker loads its script from a CDN, which the CSP blocks.
  useWebWorker: false,
});

/** Loaded on demand: only needed once a photo is taken. */
const loadCompressor = () => import('browser-image-compression');

/**
 * Loads the compressor ahead of time (report page opened with signal), so a photo taken after
 * the signal is lost can still be compressed and queued.
 */
export const preloadPhotoCompression = () => loadCompressor().catch(() => {});

/** A photo that cannot be used; `message` is shown to the user. */
export class PhotoError extends Error {}

/**
 * @param {File} file Photo from the camera or gallery.
 * @param {string} type Gives the uploaded file its name (`before`, `after`, `evidence`).
 * @returns {Promise<File>} JPEG without EXIF, at most 5 MiB.
 * @throws {PhotoError}
 */
export async function compressPhoto(file, type) {
  if (!file.type.startsWith('image/')) throw new PhotoError('File harus berupa foto.');
  let result;
  try {
    const { default: imageCompression } = await loadCompressor();
    result = await imageCompression(file, { ...COMPRESSION_OPTIONS });
  } catch {
    throw new PhotoError('Foto tidak bisa diproses. Coba ambil ulang.');
  }
  if (result.size > PHOTO_MAX_BYTES) {
    throw new PhotoError('Ukuran foto melebihi 5 MB setelah dikompres.');
  }
  return new File([result], `${type}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}
