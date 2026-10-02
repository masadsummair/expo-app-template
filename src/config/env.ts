import { z } from 'zod';

/*
 * Client-side env. Everything here is inlined into the JS bundle in plain text —
 * only publishable values belong in EXPO_PUBLIC_*. Real secrets live server-side.
 *
 * Each variable must be read as a literal `process.env.EXPO_PUBLIC_X` expression:
 * Expo inlines them at build time, so destructuring or dynamic access returns undefined.
 */
const schema = z
  .object({
    APP_ENV: z.enum(['development', 'preview', 'production']).default('development'),
    API_URL: z.url(),
    SENTRY_DSN: z.string().optional(),
  })
  .refine((e) => e.APP_ENV === 'development' || e.API_URL.startsWith('https://'), {
    message: 'EXPO_PUBLIC_API_URL must use https:// outside development (tokens are sent to it)',
    path: ['API_URL'],
  });

const parsed = schema.safeParse({
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  API_URL: process.env.EXPO_PUBLIC_API_URL,
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
