import 'server-only';

/** Thrown when a request body is larger than allowed. */
export class BodyTooLargeError extends Error {
  constructor() {
    super('Request body too large');
    this.name = 'BodyTooLargeError';
  }
}

/**
 * Reads a request body into memory, but never more than `maxBytes`: the stream is cancelled as
 * soon as the limit is passed, so a huge (or endless, chunked) upload cannot exhaust the server's
 * memory. `request.arrayBuffer()` / `request.json()` have no such limit.
 * @param {Request} request
 * @param {number} maxBytes
 * @returns {Promise<ArrayBuffer>}
 * @throws {BodyTooLargeError}
 */
export async function readBodyWithLimit(request, maxBytes) {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new BodyTooLargeError();
  if (!request.body) return new ArrayBuffer(0);

  const reader = request.body.getReader();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

/**
 * Parses a small JSON body (e.g. login form) with a size limit. Returns `undefined` when the
 * body is not valid JSON.
 * @param {Request} request
 * @param {number} maxBytes
 * @throws {BodyTooLargeError}
 */
export async function readJsonWithLimit(request, maxBytes) {
  const buffer = await readBodyWithLimit(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    return undefined;
  }
}
