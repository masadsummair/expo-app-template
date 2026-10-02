import * as Sentry from '@sentry/react-native';

import { env } from '@/config/env';

/** Call once at startup. A no-op until EXPO_PUBLIC_SENTRY_DSN is set. */
export function initCrashReporting(): void {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV,
    enabled: !__DEV__,
    tracesSampleRate: env.APP_ENV === 'production' ? 0.2 : 1,
  });
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (__DEV__) console.error(error, context);
  Sentry.captureException(error, context && { extra: context });
}
