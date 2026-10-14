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

/** Origin of the built-in mock Go backend started by `src/instrumentation.js` in mock mode. */
export const MOCK_API_ORIGIN = 'http://127.0.0.1:4010';

/** Development-only fallback secret, used when mocking and no SESSION_SECRET is set. */
const DEV_MOCK_SESSION_SECRET = 'dev-only-mock-session-secret-not-for-production-use';

const clientSchema = z.object({
  NEXT_PUBLIC_API_MOCKING: z.enum(['enabled', 'disabled']).default('disabled'),
  /** IANA time zone used to compute "today" and to display dates (sites have no zone field). */
  NEXT_PUBLIC_APP_TIMEZONE: z.string().min(1).default('Asia/Jakarta'),
});

const serverSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Origin of the Go backend, called server-side by the BFF, e.g. http://api.internal:8080 */
    API_ORIGIN: z.url({ protocol: /^https?$/ }).optional(),
    /** Key material for the encrypted session cookie. At least 32 characters, random. */
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters.').optional(),
    /** Name of the refresh-token cookie set by the Go backend. */
    GO_REFRESH_COOKIE_NAME: z.string().min(1).default('refresh_token'),
    NEXT_PUBLIC_API_MOCKING: clientSchema.shape.NEXT_PUBLIC_API_MOCKING,
  })
  .superRefine((env, ctx) => {
    const mocking = env.NEXT_PUBLIC_API_MOCKING === 'enabled';
    if (env.NODE_ENV === 'production' && mocking) {
      ctx.addIssue({
        code: 'custom',
        path: ['NEXT_PUBLIC_API_MOCKING'],
        message: 'API mocking must not be enabled in a production build.',
      });
    }
    if (!mocking && !env.API_ORIGIN) {
      ctx.addIssue({
        code: 'custom',
        path: ['API_ORIGIN'],
        message: 'API_ORIGIN is required unless NEXT_PUBLIC_API_MOCKING=enabled.',
      });
    }
    if (!mocking && !env.SESSION_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_SECRET'],
        message: 'SESSION_SECRET is required (generate one with `openssl rand -base64 48`).',
      });
    }
  })
  .transform((env) => {
    const mocking = env.NEXT_PUBLIC_API_MOCKING === 'enabled';
    return {
      ...env,
      // Mock mode always talks to the built-in mock Go backend.
      API_ORIGIN: (mocking ? MOCK_API_ORIGIN : (env.API_ORIGIN ?? MOCK_API_ORIGIN)).replace(
        /\/+$/,
        '',
      ),
      SESSION_SECRET: env.SESSION_SECRET ?? (mocking ? DEV_MOCK_SESSION_SECRET : ''),
    };
  });

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
    NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING || undefined,
  });
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Public, build-time inlined environment variables (safe for the browser). */
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING || undefined,
  NEXT_PUBLIC_APP_TIMEZONE: process.env.NEXT_PUBLIC_APP_TIMEZONE || undefined,
});
