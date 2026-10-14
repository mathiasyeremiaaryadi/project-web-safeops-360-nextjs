import { http, HttpResponse } from 'msw';

/**
 * Parses a request body the way the mock backend expects (JSON object, FormData or null).
 * @param {Request} request
 */
export async function readMockBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('multipart/form-data')) return request.formData();
  const text = await request.text();
  return text ? JSON.parse(text) : null;
}

/**
 * MSW handler exposing the mock Go backend under `<origin>/api/v1/*` (Vitest).
 * @param {import('@/mocks/go-backend').GoBackend} backend
 * @param {string} origin e.g. `http://go.test`
 */
export function createGoApiHandlers(backend, origin) {
  return [
    http.all(`${origin}/api/v1/*`, async ({ request }) => {
      const url = new URL(request.url);
      const result = backend.handle({
        method: request.method,
        path: url.pathname.replace(/^\/api\/v1\//, ''),
        query: url.searchParams,
        header: (name) => request.headers.get(name),
        body: await readMockBody(request),
      });
      if (result.networkError) return HttpResponse.error();

      const headers = new Headers();
      for (const cookie of result.setCookies ?? []) headers.append('Set-Cookie', cookie);
      if (result.status === 204) return new HttpResponse(null, { status: 204, headers });
      return HttpResponse.json(result.body, { status: result.status, headers });
    }),
  ];
}
