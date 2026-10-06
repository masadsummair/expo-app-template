import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';

import { ErrorState, Screen } from '@/components/ui';
import { reportError } from '@/lib/crash-reporting';

/**
 * Shared Expo Router error screen. Re-export it from a layout or route as
 * `export { ErrorFallback as ErrorBoundary } from '@/components/error-fallback'`
 * so a render error is contained to that part of the app.
 */
export function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <Screen className="justify-center">
      <ErrorState
        testID="route-error"
        message={__DEV__ ? error.message : 'Something went wrong. Please try again.'}
        onRetry={retry}
      />
    </Screen>
  );
}
