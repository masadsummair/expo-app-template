import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/services/api/api-problem';
import { useAuthStore } from '@/stores/auth-store';

/** An expired or revoked token signs the user out everywhere, not per screen. */
function handleUnauthorized(error: Error) {
  if (error instanceof ApiError && error.problem.kind === 'unauthorized') {
    void useAuthStore.getState().signOut();
  }
}

/** Retry only problems marked temporary (timeouts, connectivity) — never 4xx or bad data. */
export function shouldRetry(failureCount: number, error: Error): boolean {
  return failureCount < 2 && error instanceof ApiError && 'temporary' in error.problem;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: shouldRetry },
  },
});

// Drop every cached response on sign-out so the next account never sees the previous one's data.
useAuthStore.subscribe((state, previous) => {
  if (previous.status === 'signed-in' && state.status === 'signed-out') queryClient.clear();
});
