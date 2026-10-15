import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineDb } from '@/features/offline/db';
import {
  clearPendingUploads,
  enqueueUpload,
  listPendingUploads,
  MAX_UPLOAD_ATTEMPTS,
  processUploadQueue,
  resetUploadAttempts,
} from '@/features/offline/upload-queue';

const photo = (text = 'jpeg') => new Blob([text], { type: 'image/jpeg' });
const networkError = Object.assign(new Error('offline'), { status: 0, code: 'NETWORK_ERROR' });
const serverError = Object.assign(new Error('boom'), { status: 500, code: 'UNKNOWN' });

beforeEach(async () => {
  await offlineDb.pendingUploads.clear();
});

describe('upload queue', () => {
  it('keeps one photo per report and type: a new photo replaces the queued one', async () => {
    await enqueueUpload({ userId: 'u1', reportId: 'r1', type: 'before', blob: photo('a') });
    await enqueueUpload({ userId: 'u1', reportId: 'r1', type: 'after', blob: photo('b') });
    await enqueueUpload({ userId: 'u1', reportId: 'r1', type: 'before', blob: photo('c') });
    const items = await listPendingUploads('u1');
    expect(items.map((item) => item.type)).toEqual(['after', 'before']);
    expect(items.every((item) => item.attempts === 0)).toBe(true);
  });

  it('sends oldest first once online, removing what was sent', async () => {
    await enqueueUpload({ userId: 'u1', reportId: 'r1', type: 'before', blob: photo() });
    await enqueueUpload({ userId: 'u1', reportId: 'r2', type: 'before', blob: photo() });
    const send = vi.fn().mockResolvedValue(undefined);
    expect(await processUploadQueue('u1', send)).toEqual(['r1', 'r2']);
    expect(send.mock.calls.map(([upload]) => upload.reportId)).toEqual(['r1', 'r2']);
    expect(await listPendingUploads('u1')).toEqual([]);
  });

  it('stops at a network error and keeps the photo for later', async () => {
    await enqueueUpload({ userId: 'u1', reportId: 'r1', type: 'before', blob: photo() });
    await enqueueUpload({ userId: 'u1', reportId: 'r2', type: 'before', blob: photo() });
    const send = vi.fn(() => Promise.reject(networkError));
    expect(await processUploadQueue('u1', send)).toEqual([]);
    expect(send).toHaveBeenCalledTimes(1);
    const [first] = await listPendingUploads('u1');
    expect(first).toMatchObject({ reportId: 'r1', attempts: 1, lastError: 'NETWORK_ERROR' });
  });

  it('gives up after 5 failed attempts until "Coba lagi"', async () => {
    await enqueueUpload({ userId: 'u1', reportId: 'r1', type: 'after', blob: photo() });
    const send = vi.fn(() => Promise.reject(serverError));
    for (let i = 0; i < MAX_UPLOAD_ATTEMPTS + 2; i += 1) await processUploadQueue('u1', send);
    expect(send).toHaveBeenCalledTimes(MAX_UPLOAD_ATTEMPTS);
    const [failed] = await listPendingUploads('u1');
    expect(failed.attempts).toBe(MAX_UPLOAD_ATTEMPTS);

    await resetUploadAttempts(failed.id);
    send.mockImplementation(() => Promise.resolve());
    expect(await processUploadQueue('u1', send)).toEqual(['r1']);
  });

  it('logout removes only that user’s photos; another login removes the others', async () => {
    await enqueueUpload({ userId: 'u1', reportId: 'r1', type: 'before', blob: photo() });
    await enqueueUpload({ userId: 'u2', reportId: 'r9', type: 'before', blob: photo() });
    await enqueueUpload({ userId: 'u3', reportId: 'r8', type: 'before', blob: photo() });
    await clearPendingUploads({ userId: 'u1' });
    expect(await listPendingUploads('u1')).toEqual([]);
    expect(await listPendingUploads('u2')).toHaveLength(1);

    await clearPendingUploads({ keepUserId: 'u2' });
    expect(await listPendingUploads('u2')).toHaveLength(1);
    expect(await listPendingUploads('u3')).toEqual([]);
  });
});
