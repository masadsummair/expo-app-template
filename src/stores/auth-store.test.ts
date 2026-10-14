import { reportError, setCrashUser } from '@/lib/crash-reporting';
import { authProvider } from '@/services/auth';
import type { AuthUser } from '@/services/auth/types';

import { useAuthStore } from './auth-store';

// The provider's own behaviour (keychain, restore, retry) is tested in src/services/auth/mock.test.ts.
jest.mock('@/lib/crash-reporting', () => ({ reportError: jest.fn(), setCrashUser: jest.fn() }));
jest.mock('@/services/auth', () => ({
  authProvider: { onChange: jest.fn(), signOut: jest.fn() },
}));

const provider = jest.mocked(authProvider);
const ada: AuthUser = { id: 'u1', email: 'ada@example.com', name: 'Ada' };

let emit: (user: AuthUser | null) => void;
const unsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  provider.onChange.mockImplementation((listener) => {
    emit = listener;
    return unsubscribe;
  });
  provider.signOut.mockResolvedValue(undefined);
  useAuthStore.setState({ status: 'loading', user: null });
});

describe('auth store', () => {
  it('starts loading and holds no token', () => {
    expect(useAuthStore.getState()).toMatchObject({ status: 'loading', user: null });
    expect(Object.keys(useAuthStore.getState())).not.toContain('token');
  });

  it('follows the provider from signed in to signed out', () => {
    useAuthStore.getState().connect();
    emit(ada);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', user: ada });
    emit(null);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-out', user: null });
  });

  it('applies a repeated onChange without changing the outcome', () => {
    useAuthStore.getState().connect();
    emit(ada);
    emit(ada);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', user: ada });
    emit(null);
    emit(null);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-out', user: null });
  });

  it('gives crash reporting the signed-in user, or null', () => {
    useAuthStore.getState().connect();
    emit(ada);
    expect(setCrashUser).toHaveBeenLastCalledWith(ada);
    emit(null);
    expect(setCrashUser).toHaveBeenLastCalledWith(null);
  });

  it('returns the provider unsubscribe from connect', () => {
    const stop = useAuthStore.getState().connect();
    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('asks the provider to sign out once for concurrent calls', async () => {
    useAuthStore.setState({ status: 'signed-in', user: ada });
    await Promise.all([useAuthStore.getState().signOut(), useAuthStore.getState().signOut()]);
    expect(provider.signOut).toHaveBeenCalledTimes(1);
  });

  it('does nothing when already signed out', async () => {
    useAuthStore.setState({ status: 'signed-out', user: null });
    await useAuthStore.getState().signOut();
    expect(provider.signOut).not.toHaveBeenCalled();
  });

  it('reports a provider failure instead of rejecting', async () => {
    const failure = new Error('network down');
    provider.signOut.mockRejectedValueOnce(failure);
    useAuthStore.setState({ status: 'signed-in', user: ada });
    await expect(useAuthStore.getState().signOut()).resolves.toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(failure, { where: 'auth.signOut' });
  });
});
