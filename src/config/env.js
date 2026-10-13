import { z } from 'zod';

/**
 * Environment validation.
 *
 * - Server-only variables are validated by `getServerEnv()`, which is called from
 *   `next.config.mjs` so `next dev` / `next build` fail fast on invalid config.
 * - Public variables (`NEXT_PUBLIC_*`) are inlined at build time; they must be
 *   referenced literally (`process.env.NEXT_PUBLIC_X`) for Next.js to inline them.
 * - Secrets must never use the `NEXT_PUBLIC_` prefix.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_API_MOCKING: z.enum(['enabled', 'disabled']).default('disabled'),
});

const serverSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Backend origin used by the dev-only rewrite of `/api/v1/*`, e.g. http://localhost:8080 */
    API_ORIGIN: z.url({ protocol: /^https?$/ }).optional(),
    NEXT_PUBLIC_API_MOCKING: clientSchema.shape.NEXT_PUBLIC_API_MOCKING,
  })
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === 'development' &&
      env.NEXT_PUBLIC_API_MOCKING === 'disabled' &&
      !env.API_ORIGIN
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['API_ORIGIN'],
        message: 'API_ORIGIN is required in development unless NEXT_PUBLIC_API_MOCKING=enabled.',
      });
    }
    if (env.NODE_ENV === 'production' && env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      ctx.addIssue({
        code: 'custom',
        path: ['NEXT_PUBLIC_API_MOCKING'],
        message: 'API mocking must not be enabled in a production build.',
      });
    }
  });

/**
 * Validates and returns server-side environment variables. Throws (failing the
 * dev server / build) when required variables are missing or invalid.
 * @returns {z.infer<typeof serverSchema>}
 */
export function getServerEnv() {
  const result = serverSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    API_ORIGIN: process.env.API_ORIGIN || undefined,
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
});
