import 'server-only';
import { z } from 'zod';

/**
 * Server-only environment validation (`server-only`: importing this from browser code fails
 * the build). Public variables live in `config/client-env.js`.
 *
 * - `getServerEnv()` validates at server start (`src/instrumentation.js`) and on every BFF
 *   request; the Docker build has no runtime secrets, so it is not called at build time.
 * - Secrets (`SESSION_SECRET`) must never use the `NEXT_PUBLIC_` prefix.
 */

const serverSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Origin of the Go backend, called server-side by the BFF, e.g. http://103.150.226.7:8082 */
    API_ORIGIN: z.url({ protocol: /^https?$/, error: 'API_ORIGIN is required (Go backend URL).' }),
    /**
     * Key material for the encrypted session cookie (≥ 32 random characters). Optional: when it is
     * not set, a random key is generated per server process (see `getServerEnv`).
     */
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters.').optional(),
    /** Name of the refresh-token cookie set by the Go backend. */
    GO_REFRESH_COOKIE_NAME: z.string().min(1).default('refresh_token'),
  })
  .transform((env) => ({
    ...env,
    API_ORIGIN: env.API_ORIGIN.replace(/\/+$/, ''),
    SESSION_SECRET: env.SESSION_SECRET ?? generatedSecret(),
  }));

/**
 * Random session key for this server process, used when SESSION_SECRET is not set. Secure, but
 * every restart/deploy signs all users out, and it only works with ONE server instance.
 * Kept on `globalThis`: Next.js bundles route handlers separately, and they must share one key.
 */
function generatedSecret() {
  const store = /** @type {{ __safeopsSessionSecret?: string }} */ (globalThis);
  if (!store.__safeopsSessionSecret) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(48));
    store.__safeopsSessionSecret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
      '',
    );
    console.warn(
      '[env] SESSION_SECRET is not set: using a random key for this process. ' +
        'Users are signed out on every restart; set SESSION_SECRET when running more than one instance.',
    );
  }
  return store.__safeopsSessionSecret;
}

/** @typedef {z.output<typeof serverSchema>} ServerEnv */

/**
 * Validates and returns server-side environment variables. Throws (failing the dev server,
 * the build or the request) when required variables are missing or invalid.
 * @returns {ServerEnv}
 */
export function getServerEnv() {
  const result = serverSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    API_ORIGIN: process.env.API_ORIGIN || undefined,
    SESSION_SECRET: process.env.SESSION_SECRET || undefined,
    GO_REFRESH_COOKIE_NAME: process.env.GO_REFRESH_COOKIE_NAME || undefined,
  });
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
