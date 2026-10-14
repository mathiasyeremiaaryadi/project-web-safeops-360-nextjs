import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { APP_ORIGIN, server } from '../../../tests/unit/msw.js';
import { apiRequest, registerSessionExpiredHandler } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

const okSchema = z.object({ ok: z.literal(true) });

describe('browser API client (BFF)', () => {
  /** @type {ReturnType<typeof vi.fn>} */
  let onSessionExpired;

  beforeEach(() => {
    onSessionExpired = vi.fn();
    registerSessionExpiredHandler(onSessionExpired);
  });

  it('calls the same-origin BFF without any Authorization header', async () => {
    /** @type {Request | null} */
    let seen = null;
    server.use(
      http.get(`${APP_ORIGIN}/api/test/resource`, ({ request }) => {
        seen = request;
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(
      apiRequest({ method: 'get', path: 'test/resource', schema: okSchema }),
    ).resolves.toEqual({
      ok: true,
    });
    expect(seen?.headers.get('authorization')).toBeNull();
    expect(seen?.headers.get('x-safeops-csrf')).toBeNull(); // only on state-changing methods
  });

  it.each(['post', 'put', 'patch', 'delete'])('adds the CSRF header on %s', async (method) => {
    /** @type {string | null} */
    let csrf = null;
    server.use(
      http.all(`${APP_ORIGIN}/api/test/resource`, ({ request }) => {
        csrf = request.headers.get('x-safeops-csrf');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await apiRequest({ method: /** @type {any} */ (method), path: 'test/resource', json: {} });
    expect(csrf).toBe('1');
  });

  it('reports an expired session (401) once and does not retry', async () => {
    let calls = 0;
    server.use(
      http.get(`${APP_ORIGIN}/api/test/resource`, () => {
        calls += 1;
        return HttpResponse.json(
          { error: { code: 'AUTH_UNAUTHORIZED', message: '' } },
          { status: 401 },
        );
      }),
    );
    await expect(
      apiRequest({ method: 'get', path: 'test/resource', schema: okSchema }),
    ).rejects.toMatchObject({ status: 401, code: 'AUTH_UNAUTHORIZED' });
    expect(calls).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not report an expired session for probe requests', async () => {
    server.use(
      http.get(`${APP_ORIGIN}/api/test/resource`, () =>
        HttpResponse.json({ error: { code: 'AUTH_UNAUTHORIZED', message: '' } }, { status: 401 }),
      ),
    );
    await expect(
      apiRequest({
        method: 'get',
        path: 'test/resource',
        schema: okSchema,
        context: { skipSessionExpired: true },
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('retries a failed GET once (5xx), never a POST', async () => {
    let gets = 0;
    let posts = 0;
    server.use(
      http.get(`${APP_ORIGIN}/api/test/resource`, () => {
        gets += 1;
        return HttpResponse.json({ error: { code: 'X', message: '' } }, { status: 503 });
      }),
      http.post(`${APP_ORIGIN}/api/test/resource`, () => {
        posts += 1;
        return HttpResponse.json({ error: { code: 'X', message: '' } }, { status: 503 });
      }),
    );
    await expect(apiRequest({ method: 'get', path: 'test/resource' })).rejects.toMatchObject({
      status: 503,
    });
    await expect(apiRequest({ method: 'post', path: 'test/resource' })).rejects.toMatchObject({
      status: 503,
    });
    expect(gets).toBe(2);
    expect(posts).toBe(1);
  });

  it('normalizes network errors', async () => {
    server.use(http.get(`${APP_ORIGIN}/api/test/resource`, () => HttpResponse.error()));
    const error = await apiRequest({
      method: 'get',
      path: 'test/resource',
      schema: okSchema,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('rejects responses that do not match the schema without logging the body', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      http.get(`${APP_ORIGIN}/api/test/resource`, () =>
        HttpResponse.json({ ok: 'nope', secret: 'should-not-be-logged' }),
      ),
    );
    await expect(
      apiRequest({ method: 'get', path: 'test/resource', schema: okSchema }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(String(consoleError.mock.calls[0])).not.toContain('should-not-be-logged');
  });
});
