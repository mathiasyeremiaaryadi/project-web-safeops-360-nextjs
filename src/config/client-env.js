import { z } from 'zod';

/*
 * Public environment variables (safe for the browser). `NEXT_PUBLIC_*` values are inlined at
 * build time, so they must be referenced literally (`process.env.NEXT_PUBLIC_X`).
 * Server-only variables live in `config/env.js`, which the browser bundle must never import.
 */

const clientSchema = z.object({
  /** IANA time zone used to compute "today" and to display dates (sites have no zone field). */
  NEXT_PUBLIC_APP_TIMEZONE: z.string().min(1).default('Asia/Jakarta'),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_TIMEZONE: process.env.NEXT_PUBLIC_APP_TIMEZONE || undefined,
});
