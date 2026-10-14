// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BodyTooLargeError, readBodyWithLimit, readJsonWithLimit } from '@/server/http/body';

/** A streamed (chunked) body without Content-Length, like a malicious endless upload. */
function streamedRequest(chunkCount, chunkSize) {
  let sent = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      if (sent >= chunkCount) return controller.close();
      sent += 1;
      controller.enqueue(new Uint8Array(chunkSize));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request('http://localhost/api/v1/x', {
    method: 'POST',
    body,
    duplex: 'half',
  });
  return { request, wasCancelled: () => cancelled, chunksSent: () => sent };
}

describe('readBodyWithLimit', () => {
  it('returns the body when it fits', async () => {
    const request = new Request('http://localhost/x', { method: 'POST', body: 'hello' });
    const buffer = await readBodyWithLimit(request, 10);
    expect(new TextDecoder().decode(buffer)).toBe('hello');
  });

  it('rejects a declared Content-Length over the limit without reading', async () => {
    const request = new Request('http://localhost/x', {
      method: 'POST',
      body: 'x',
      headers: { 'content-length': '999999' },
    });
    await expect(readBodyWithLimit(request, 10)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it('stops reading a streamed body as soon as it passes the limit', async () => {
    const stream = streamedRequest(1000, 1024); // would be ~1 MB
    await expect(readBodyWithLimit(stream.request, 4 * 1024)).rejects.toBeInstanceOf(
      BodyTooLargeError,
    );
    expect(stream.wasCancelled()).toBe(true);
    expect(stream.chunksSent()).toBeLessThan(10);
  });
});

describe('readJsonWithLimit', () => {
  it('parses JSON and returns undefined for invalid JSON', async () => {
    const ok = new Request('http://localhost/x', { method: 'POST', body: '{"a":1}' });
    expect(await readJsonWithLimit(ok, 100)).toEqual({ a: 1 });
    const bad = new Request('http://localhost/x', { method: 'POST', body: '{nope' });
    expect(await readJsonWithLimit(bad, 100)).toBeUndefined();
  });
});
