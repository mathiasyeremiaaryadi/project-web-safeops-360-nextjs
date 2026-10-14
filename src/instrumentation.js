/**
 * Runs once when the Next.js server starts. In mock mode (development only) it starts the
 * mock Go backend on MOCK_API_ORIGIN, so the BFF talks to it exactly like to the real Go API.
 */
export async function register() {
  if (
    process.env.NEXT_RUNTIME !== 'nodejs' ||
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled'
  ) {
    return;
  }

  const globalState = /** @type {{ __safeopsMockGo?: boolean }} */ (globalThis);
  if (globalState.__safeopsMockGo) return;
  globalState.__safeopsMockGo = true;

  const { MOCK_API_ORIGIN } = await import('@/config/env');
  const { startGoMockServer } = await import('@/mocks/go-mock-server');
  const { port, hostname } = new URL(MOCK_API_ORIGIN);
  try {
    await startGoMockServer({ port: Number(port), host: hostname });
    console.warn(`[mock-go] Mock Go backend on ${MOCK_API_ORIGIN}`);
  } catch (error) {
    // Already running (e.g. a second dev server): reuse it.
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'EADDRINUSE') throw error;
  }
}
