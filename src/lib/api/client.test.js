import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { server } from '@/mocks/server';
import { apiRequest, refreshAccessToken, registerAuthHandlers } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { refresh } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { z } from 'zod';

const VALID_TOKEN = 'fresh-token';
const resourceSchema = z.object({ ok: z.literal(true) });

/** Protected endpoint: only accepts the refreshed token. */
function protectedResourceHandler(calls) {
  return http.get('*/api/v1/test/resource', ({ request }) => {
    calls.push(request.headers.get('Authorization'));
    if (request.headers.get('Authorization') === `Bearer ${VALID_TOKEN}`) {
      return HttpResponse.json({ ok: true });
    }
    return HttpResponse.json(
      { error: { code: 'AUTH_UNAUTHORIZED', message: 'expired' } },
      { status: 401 },
    );
  });
}

describe('API client', () => {
  /** @type {ReturnType<typeof vi.fn>} */
  let onSessionExpired;

  beforeEach(() => {
    useSessionStore.getState().clear();
    useSessionStore.getState().setAccessToken('stale-token');
    // Same contract as the real handler: the session is cleared.
    onSessionExpired = vi.fn(() => useSessionStore.getState().clear());
    registerAuthHandlers({
      getAccessToken: () => useSessionStore.getState().accessToken,
      refresh: async () => {
        const tokens = await refresh();
        useSessionStore.getState().setAccessToken(tokens.access_token);
        return tokens.access_token;
      },
      onSessionExpired,
    });
  });

  it('shares ONE refresh between 3 parallel requests that get 401, then retries each once', async () => {
    let refreshCalls = 0;
    /** @type {(string | null)[]} */
    const resourceCalls = [];
    server.use(
      protectedResourceHandler(resourceCalls),
      http.post('*/api/v1/auth/refresh', async () => {
        refreshCalls += 1;
        await delay(50);
        return HttpResponse.json({
          access_token: VALID_TOKEN,
          token_type: 'Bearer',
          expires_in: 900,
        });
      }),
    );

    const results = await Promise.all([
      apiRequest({ method: 'get', path: 'test/resource', schema: resourceSchema }),
      apiRequest({ method: 'get', path: 'test/resource', schema: resourceSchema }),
      apiRequest({ method: 'get', path: 'test/resource', schema: resourceSchema }),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1);
    // 3 initial attempts with the stale token + exactly 1 retry each with the new token.
    expect(resourceCalls.filter((h) => h === 'Bearer stale-token')).toHaveLength(3);
    expect(resourceCalls.filter((h) => h === `Bearer ${VALID_TOKEN}`)).toHaveLength(3);
    expect(useSessionStore.getState().accessToken).toBe(VALID_TOKEN);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('retries a PUT once after refreshing', async () => {
    let attempts = 0;
    server.use(
      http.put('*/api/v1/test/resource', ({ request }) => {
        attempts += 1;
        return request.headers.get('Authorization') === `Bearer ${VALID_TOKEN}`
          ? new HttpResponse(null, { status: 204 })
          : HttpResponse.json(
              { error: { code: 'AUTH_UNAUTHORIZED', message: '' } },
              { status: 401 },
            );
      }),
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({ access_token: VALID_TOKEN, token_type: 'Bearer', expires_in: 900 }),
      ),
    );

    await expect(
      apiRequest({ method: 'put', path: 'test/resource', json: { a: 1 } }),
    ).resolves.toBeUndefined();
    expect(attempts).toBe(2);
  });

  it('expires the session when refresh fails, without retrying', async () => {
    let refreshCalls = 0;
    /** @type {(string | null)[]} */
    const resourceCalls = [];
    server.use(
      protectedResourceHandler(resourceCalls),
      http.post('*/api/v1/auth/refresh', () => {
        refreshCalls += 1;
        return HttpResponse.json(
          { error: { code: 'AUTH_REFRESH_INVALID', message: '' } },
          { status: 401 },
        );
      }),
    );

    const results = await Promise.allSettled([
      apiRequest({ method: 'get', path: 'test/resource', schema: resourceSchema }),
      apiRequest({ method: 'get', path: 'test/resource', schema: resourceSchema }),
      apiRequest({ method: 'get', path: 'test/resource', schema: resourceSchema }),
    ]);

    expect(refreshCalls).toBe(1);
    expect(resourceCalls).toHaveLength(3);
    for (const result of results) {
      expect(result.status).toBe('rejected');
      expect(/** @type {PromiseRejectedResult} */ (result).reason).toMatchObject({ status: 401 });
    }
    expect(onSessionExpired).toHaveBeenCalled();
  });

  it('expires the session when the retried request is still 401', async () => {
    let attempts = 0;
    server.use(
      http.get('*/api/v1/test/resource', () => {
        attempts += 1;
        return HttpResponse.json(
          { error: { code: 'AUTH_UNAUTHORIZED', message: '' } },
          { status: 401 },
        );
      }),
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({ access_token: VALID_TOKEN, token_type: 'Bearer', expires_in: 900 }),
      ),
    );

    await expect(
      apiRequest({ method: 'get', path: 'test/resource', schema: resourceSchema }),
    ).rejects.toMatchObject({ status: 401 });
    expect(attempts).toBe(2);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not try to refresh for the login endpoint', async () => {
    const refreshSpy = vi.fn();
    server.use(http.post('*/api/v1/auth/refresh', refreshSpy));

    await expect(
      apiRequest({
        method: 'post',
        path: 'auth/login',
        json: { username: 'x', password: 'y' },
        context: { skipAuth: true, skipRefresh: true },
      }),
    ).rejects.toMatchObject({ status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('retries a late 401 with the already refreshed token instead of refreshing again', async () => {
    let refreshCalls = 0;
    /** @type {(string | null)[]} */
    const resourceCalls = [];
    server.use(
      protectedResourceHandler(resourceCalls),
      http.post('*/api/v1/auth/refresh', () => {
        refreshCalls += 1;
        return HttpResponse.json({
          access_token: VALID_TOKEN,
          token_type: 'Bearer',
          expires_in: 900,
        });
      }),
    );

    await apiRequest({ method: 'get', path: 'test/resource', schema: resourceSchema });
    // A request that was sent with the old token and answered 401 after the refresh finished.
    useSessionStore.getState().setAccessToken(VALID_TOKEN);
    server.use(
      http.get('*/api/v1/test/late', ({ request }) =>
        request.headers.get('Authorization') === `Bearer ${VALID_TOKEN}`
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json(
              { error: { code: 'AUTH_UNAUTHORIZED', message: '' } },
              { status: 401 },
            ),
      ),
    );
    const { httpClient } = await import('@/lib/api/client');
    const response = await httpClient.get('test/late', {
      headers: { Authorization: 'Bearer stale-token' },
      context: { skipAuth: true },
    });
    expect(response.status).toBe(200);
    expect(refreshCalls).toBe(1);
  });

  it('refreshAccessToken() is single-flight', async () => {
    let refreshCalls = 0;
    server.use(
      http.post('*/api/v1/auth/refresh', async () => {
        refreshCalls += 1;
        await delay(20);
        return HttpResponse.json({
          access_token: VALID_TOKEN,
          token_type: 'Bearer',
          expires_in: 900,
        });
      }),
    );
    const tokens = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);
    expect(tokens).toEqual([VALID_TOKEN, VALID_TOKEN, VALID_TOKEN]);
    expect(refreshCalls).toBe(1);
  });

  it('normalizes network errors', async () => {
    server.use(http.get('*/api/v1/test/resource', () => HttpResponse.error()));
    const error = await apiRequest({
      method: 'get',
      path: 'test/resource',
      schema: resourceSchema,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('rejects responses that do not match the schema without logging the body', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      http.get('*/api/v1/test/resource', () =>
        HttpResponse.json({ ok: 'nope', access_token: 'secret-token' }),
      ),
    );
    useSessionStore.getState().setAccessToken(VALID_TOKEN);

    await expect(
      apiRequest({ method: 'get', path: 'test/resource', schema: resourceSchema }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(String(consoleError.mock.calls[0])).not.toContain('secret-token');
  });
});
