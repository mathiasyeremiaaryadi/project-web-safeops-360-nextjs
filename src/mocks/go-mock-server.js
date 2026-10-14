import { createServer } from 'node:http';
import { createGoBackend } from './go-backend.js';

/*
 * Standalone HTTP server that imitates the Go backend. Started automatically by
 * src/instrumentation.js when NEXT_PUBLIC_API_MOCKING=enabled (dev), and by Playwright
 * (scripts/mock-go-server.mjs). Test-only control endpoints live under /__mock/.
 */

/**
 * Converts a Node request into a Web Request so JSON and multipart bodies parse uniformly.
 * @param {import('node:http').IncomingMessage} req
 * @param {URL} url
 */
async function toWebRequest(req, url) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  const method = req.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD' && chunks.length > 0;
  return new Request(url, { method, headers, body: hasBody ? Buffer.concat(chunks) : undefined });
}

/** @param {Request} request */
async function readBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  const type = request.headers.get('content-type') ?? '';
  try {
    if (type.includes('multipart/form-data')) return await request.formData();
    const text = await request.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ port: number, host?: string }} options
 * @returns {Promise<import('node:http').Server>}
 */
export function startGoMockServer({ port, host = '127.0.0.1' }) {
  const backend = createGoBackend();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${host}:${port}`);
    const request = await toWebRequest(req, url);
    const body = await readBody(request);

    /**
     * @param {number} status
     * @param {unknown} [json]
     * @param {string[]} [setCookies]
     */
    const send = (status, json, setCookies = []) => {
      if (setCookies.length) res.setHeader('Set-Cookie', setCookies);
      if (json === undefined || status === 204) {
        res.writeHead(status).end();
        return;
      }
      res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(json));
    };

    // ---- Test control endpoints ----
    if (url.pathname === '/__mock/health') return send(200, { ok: true });
    if (url.pathname === '/__mock/stats') return send(200, backend.stats());
    if (url.pathname === '/__mock/reset-user' && req.method === 'POST') {
      backend.resetUser(String(body?.username ?? ''));
      return send(204);
    }
    if (url.pathname === '/__mock/reset' && req.method === 'POST') {
      backend.reset();
      return send(204);
    }

    if (!url.pathname.startsWith('/api/v1/')) return send(404, { error: { code: 'NOT_FOUND' } });

    const result = backend.handle({
      method: request.method,
      path: url.pathname.replace(/^\/api\/v1\//, ''),
      query: url.searchParams,
      header: (name) => request.headers.get(name),
      body,
    });
    if (result.networkError) {
      req.socket.destroy();
      return undefined;
    }
    return send(result.status, result.body, result.setCookies);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}
