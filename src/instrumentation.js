/**
 * Runs once when the Next.js server starts (`next dev`, `next start`, `node server.js`) — not
 * during `next build`. Fails fast with a clear message when API_ORIGIN or SESSION_SECRET is
 * missing, instead of failing on the first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { getServerEnv } = await import('@/config/env');
  getServerEnv();
}
