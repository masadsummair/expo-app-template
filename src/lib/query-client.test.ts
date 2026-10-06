import { ApiError } from '@/services/api/api-problem';
import { useAuthStore } from '@/stores/auth-store';

import { queryClient, shouldRetry } from './query-client';

// Cached queries hold 5-minute garbage-collection timers that keep Jest alive.
afterEach(() => queryClient.clear());

describe('shouldRetry', () => {
  it('retries temporary problems up to twice', () => {
    const timeout = new ApiError({ kind: 'timeout', temporary: true });
    expect(shouldRetry(0, timeout)).toBe(true);
    expect(shouldRetry(1, timeout)).toBe(true);
    expect(shouldRetry(2, timeout)).toBe(false);
  });

  it('never retries client errors or bad data', () => {
    expect(shouldRetry(0, new ApiError({ kind: 'not-found' }))).toBe(false);
    expect(shouldRetry(0, new ApiError({ kind: 'bad-data', message: 'x' }))).toBe(false);
    expect(shouldRetry(0, new Error('plain'))).toBe(false);
  });
});

describe('defaults', () => {
  it('runs mutations offline so they fail fast instead of queueing', () => {
    expect(queryClient.getDefaultOptions().mutations?.networkMode).toBe('always');
  });
});

describe('session handling', () => {
  beforeEach(async () => {
    await useAuthStore.getState().signIn('token');
  });

  it('signs out when any query fails with unauthorized', async () => {
    await queryClient
      .fetchQuery({
        queryKey: ['me'],
        queryFn: () => Promise.reject(new ApiError({ kind: 'unauthorized' })),
        retry: false,
        // Sign-out clears the cache while this query settles, so it schedules its GC timer
        // after leaving the cache; gcTime 0 stops that timer from keeping Jest alive.
        gcTime: 0,
      })
      .catch(() => undefined);
    expect(useAuthStore.getState().status).toBe('signed-out');
  });

  it('clears cached data on sign-out so the next account cannot see it', async () => {
    queryClient.setQueryData(['orders'], [{ id: 'private' }]);
    await useAuthStore.getState().signOut();
    expect(queryClient.getQueryData(['orders'])).toBeUndefined();
  });
});
