import { waitFor } from '@testing-library/react-native';

import { ApiError } from '@/services/api/api-problem';
import { authProvider } from '@/services/auth';
import type { MockAuthProvider } from '@/services/auth/mock';
import { useAuthStore } from '@/stores/auth-store';

import { queryClient, shouldRetry } from './query-client';

// The store follows whatever `@/services/auth` exports, so the test pins it to a mock instance: on an auth
// variant the real provider sits there, and signing in through the mock module would never reach the store.
jest.mock('@/services/auth', () => ({
  authProvider: jest
    .requireActual<typeof import('@/services/auth/mock')>('@/services/auth/mock')
    .createMockAuthProvider(),
}));
const mockAuthProvider = authProvider as MockAuthProvider;

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
  let disconnect: () => void;

  beforeEach(async () => {
    disconnect = useAuthStore.getState().connect();
    await mockAuthProvider.signInWithPassword('ada@example.com', 'password123');
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signed-in'));
  });

  afterEach(async () => {
    disconnect();
    await mockAuthProvider.signOut();
    useAuthStore.setState({ status: 'loading', user: null });
    jest.restoreAllMocks();
  });

  // Sign-out clears the cache while a query settles, so it schedules its GC timer after leaving the
  // cache; gcTime 0 stops that timer from keeping Jest alive.
  const failUnauthorized = (key: string) =>
    queryClient
      .fetchQuery({
        queryKey: [key],
        queryFn: () => Promise.reject(new ApiError({ kind: 'unauthorized' })),
        retry: false,
        gcTime: 0,
      })
      .catch(() => undefined);

  it('signs out when any query fails with unauthorized', async () => {
    await failUnauthorized('me');
    expect(useAuthStore.getState().status).toBe('signed-out');
  });

  it('signs out once when several requests fail with unauthorized together', async () => {
    const signOut = jest.spyOn(authProvider, 'signOut');
    await Promise.all([failUnauthorized('a'), failUnauthorized('b'), failUnauthorized('c')]);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('ignores an unauthorized that arrives after sign-out, so a 401 cannot loop', async () => {
    await useAuthStore.getState().signOut();
    const signOut = jest.spyOn(authProvider, 'signOut');
    await failUnauthorized('late');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('clears cached data on sign-out so the next account cannot see it', async () => {
    queryClient.setQueryData(['orders'], [{ id: 'private' }]);
    await useAuthStore.getState().signOut();
    expect(queryClient.getQueryData(['orders'])).toBeUndefined();
  });

  it('clears cached data when the account changes with no sign-out in between', () => {
    queryClient.setQueryData(['orders'], [{ id: 'private' }]);
    useAuthStore.setState({ status: 'signed-in', user: { id: 'other', email: null, name: null } });
    expect(queryClient.getQueryData(['orders'])).toBeUndefined();
  });

  it('keeps cached data when the same account is reported again', () => {
    queryClient.setQueryData(['orders'], [{ id: 'mine' }]);
    const user = useAuthStore.getState().user;
    useAuthStore.setState({ status: 'signed-in', user: user && { ...user } });
    expect(queryClient.getQueryData(['orders'])).toEqual([{ id: 'mine' }]);
  });
});
