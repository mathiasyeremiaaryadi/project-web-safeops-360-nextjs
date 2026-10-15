import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMPRESSION_OPTIONS,
  compressPhoto,
  PHOTO_MAX_BYTES,
  PhotoError,
} from '@/features/task-report/lib/photo';

const imageCompression = vi.hoisted(() => vi.fn());
// A plain wrapper: the failure case below throws from here, not from the vi.fn().
const failure = vi.hoisted(() => ({ error: /** @type {Error | null} */ (null) }));
vi.mock('browser-image-compression', () => ({
  default: (/** @type {unknown[]} */ ...args) => {
    if (failure.error) return Promise.reject(failure.error);
    return imageCompression(...args);
  },
}));

const photo = (size = 10, type = 'image/png') =>
  new File([new Uint8Array(size)], 'IMG_0001.png', { type });

beforeEach(() => {
  imageCompression.mockReset();
  failure.error = null;
});

describe('compressPhoto', () => {
  it('compresses to a 1600 px JPEG without EXIF and names it after the type', async () => {
    imageCompression.mockResolvedValue(new Blob([new Uint8Array(4)], { type: 'image/jpeg' }));
    const result = await compressPhoto(photo(), 'after');
    expect(imageCompression).toHaveBeenCalledWith(expect.any(File), {
      ...COMPRESSION_OPTIONS,
    });
    expect(COMPRESSION_OPTIONS).toMatchObject({
      maxWidthOrHeight: 1600,
      initialQuality: 0.7,
      fileType: 'image/jpeg',
      preserveExif: false,
    });
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('after.jpg');
    expect(result.type).toBe('image/jpeg');
  });

  it('rejects a file that is not a photo, without compressing', async () => {
    await expect(compressPhoto(photo(10, 'application/pdf'), 'before')).rejects.toThrow(PhotoError);
    expect(imageCompression).not.toHaveBeenCalled();
  });

  it('rejects a photo still larger than 5 MiB after compression', async () => {
    imageCompression.mockResolvedValue({ size: PHOTO_MAX_BYTES + 1 });
    await expect(compressPhoto(photo(), 'before')).rejects.toThrow('melebihi 5 MB');
  });

  it('turns a compression failure into a readable message', async () => {
    failure.error = new Error('decode failed');
    await expect(compressPhoto(photo(), 'before')).rejects.toThrow('Foto tidak bisa diproses');
  });
});
