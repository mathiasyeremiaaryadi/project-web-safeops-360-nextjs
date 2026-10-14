import { z } from 'zod';

/**
 * Environment validation.
 *
 * - Server-only variables are validated by `getServerEnv()`. It is called from
 *   `next.config.mjs`, so `next dev` / `next build` fail fast on invalid config, and again at
 *   runtime by the BFF (Route Handlers).
 * - Public variables (`NEXT_PUBLIC_*`) are inlined at build time; they must be referenced
 *   literally (`process.env.NEXT_PUBLIC_X`) for Next.js to inline them.
 * - Secrets (`SESSION_SECRET`) must never use the `NEXT_PUBLIC_` prefix.
 */

const clientSchema = z.object({
  /** IANA time zone used to compute "today" and to display dates (sites have no zone field). */
  NEXT_PUBLIC_APP_TIMEZONE: z.string().min(1).default('Asia/Jakarta'),
});

const serverSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Origin of the Go backend, called server-side by the BFF, e.g. http://103.150.226.7:8082 */
    API_ORIGIN: z.url({ protocol: /^https?$/, error: 'API_ORIGIN is required (Go backend URL).' }),
    /** Key material for the encrypted session cookie. At least 32 characters, random. */
    SESSION_SECRET: z
      .string({
        error: 'SESSION_SECRET is required (generate one with `openssl rand -base64 48`).',
      })
      .min(32, 'SESSION_SECRET must be at least 32 characters.'),
    /** Name of the refresh-token cookie set by the Go backend. */
    GO_REFRESH_COOKIE_NAME: z.string().min(1).default('refresh_token'),
  })
  .transform((env) => ({ ...env, API_ORIGIN: env.API_ORIGIN.replace(/\/+$/, '') }));

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

/** Public, build-time inlined environment variables (safe for the browser). */
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_TIMEZONE: process.env.NEXT_PUBLIC_APP_TIMEZONE || undefined,
});
