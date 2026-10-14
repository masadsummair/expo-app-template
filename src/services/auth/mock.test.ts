import { waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { reportError } from '@/lib/crash-reporting';
import { storage } from '@/lib/storage';

import { createMockAuthProvider, MockAuthRefusedError } from './mock';

let mockAppEnv = 'development';
jest.mock('@/config/env', () => ({
  env: {
    get APP_ENV() {
      return mockAppEnv;
    },
  },
}));
jest.mock('@/lib/crash-reporting', () => ({ reportError: jest.fn() }));

const secureStore = jest.mocked(SecureStore);
const deviceOnly = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const devUser = expect.objectContaining({ id: 'dev-user' });
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let onAppStateChange: (status: string) => void;
const removeListener = jest.fn();

beforeEach(async () => {
  mockAppEnv = 'development';
  await SecureStore.deleteItemAsync('auth.token');
  storage.clearAll();
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, listener: never) => {
    onAppStateChange = listener;
    return { remove: removeListener };
  }) as never);
});
afterEach(() => jest.restoreAllMocks());

/** A promise the test settles by hand, to hold a keychain read open while something else happens. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: Error) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A fresh provider with one subscriber. The keychain read has started but not necessarily finished. */
function subscribe() {
  const provider = createMockAuthProvider();
  const listener = jest.fn();
  const stop = provider.onChange(listener);
  return { provider, listener, stop };
}

/** Like `subscribe`, but waits for the restored session and for any stray second event. */
async function restored() {
  const subscription = subscribe();
  await waitFor(() => expect(subscription.listener).toHaveBeenCalledTimes(1));
  await settle();
  return subscription;
}

describe('mock auth provider', () => {
  it('runs on a Jest keychain mock that exports the accessibility constant', () => {
    // Without it the device-only assertions below would compare undefined to undefined.
    expect(SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY).toBeDefined();
  });

  it('restores a stored session and reports it once, reading with the device-only option', async () => {
    await SecureStore.setItemAsync('auth.token', 'stored');
    const { provider, listener } = await restored();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(devUser);
    await expect(provider.getAccessToken()).resolves.toBe('stored');
    expect(secureStore.getItemAsync).toHaveBeenCalledWith('auth.token', deviceOnly);
  });

  it('reports signed out when nothing is stored', async () => {
    const { provider, listener } = await restored();
    expect(listener).toHaveBeenCalledWith(null);
    await expect(provider.getAccessToken()).resolves.toBeNull();
  });

  it('tells each subscriber the restored session once, even when React subscribes twice', async () => {
    await SecureStore.setItemAsync('auth.token', 'stored');
    const provider = createMockAuthProvider();
    const first = jest.fn();
    const second = jest.fn();
    const stopFirst = provider.onChange(first);
    stopFirst();
    provider.onChange(second);

    await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
    await settle();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it('tells a late subscriber the current session straight away', async () => {
    const { provider } = await restored();
    await provider.signInWithPassword('ada@example.com', 'password123');
    const late = jest.fn();
    provider.onChange(late);
    expect(late).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledWith(devUser);
  });

  it('reports signed out when the keychain read fails, then reads again on the next foreground', async () => {
    await SecureStore.setItemAsync('auth.token', 'stored');
    secureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    const { provider, listener } = subscribe();
    await waitFor(() => expect(listener).toHaveBeenCalledWith(null));
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { where: 'auth.restore' });

    onAppStateChange('active');
    await waitFor(() => expect(listener).toHaveBeenLastCalledWith(devUser));
    expect(listener).toHaveBeenCalledTimes(2);
    await expect(provider.getAccessToken()).resolves.toBe('stored');
  });

  it('skips the foreground keychain read when the user signed in after a failed restore', async () => {
    secureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    const { provider, listener } = subscribe();
    await waitFor(() => expect(listener).toHaveBeenCalledWith(null));
    await provider.signInWithPassword('ada@example.com', 'password123');
    secureStore.getItemAsync.mockClear();

    onAppStateChange('active');
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
    expect(listener).toHaveBeenLastCalledWith(devUser);
  });

  it('keeps a sign-in made while the first keychain read is pending when that read then fails', async () => {
    const read = deferred<string | null>();
    secureStore.getItemAsync.mockReturnValueOnce(read.promise);
    const { provider, listener } = subscribe();
    await provider.signInWithPassword('ada@example.com', 'password123');

    read.reject(new Error('keychain locked'));
    await waitFor(() =>
      expect(reportError).toHaveBeenCalledWith(expect.any(Error), { where: 'auth.restore' }),
    );
    await settle();
    expect(listener).not.toHaveBeenCalledWith(null);
    expect(listener).toHaveBeenLastCalledWith(devUser);
    await expect(provider.getAccessToken()).resolves.toBe('dev-token');
  });

  it('does not let a slow first keychain read replace a newer sign-in with the old token', async () => {
    const read = deferred<string | null>();
    secureStore.getItemAsync.mockReturnValueOnce(read.promise);
    const { provider, listener } = subscribe();
    await provider.signInWithPassword('ada@example.com', 'password123');

    read.resolve('old-token');
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(2));
    await settle();
    expect(listener).toHaveBeenLastCalledWith(devUser);
    await expect(provider.getAccessToken()).resolves.toBe('dev-token');
  });

  it('removes the pending foreground retry listener on sign-out', async () => {
    secureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    const { provider, listener } = subscribe();
    await waitFor(() => expect(listener).toHaveBeenCalledWith(null));
    expect(removeListener).not.toHaveBeenCalled();

    await provider.signOut();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('signs out in memory even when the keychain delete fails', async () => {
    const { provider, listener } = await restored();
    await provider.signInWithPassword('ada@example.com', 'password123');
    secureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain locked'));

    await expect(provider.signOut()).resolves.toBeUndefined();
    expect(listener).toHaveBeenLastCalledWith(null);
    await expect(provider.getAccessToken()).resolves.toBeNull();
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { where: 'auth.signOut' });
  });

  it('stays signed out on the next launch when the keychain delete failed at sign-out', async () => {
    const { provider } = await restored();
    await provider.signInWithPassword('ada@example.com', 'password123');
    secureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await provider.signOut();
    await expect(SecureStore.getItemAsync('auth.token')).resolves.toBe('dev-token');

    const relaunch = await restored();
    expect(relaunch.listener).toHaveBeenCalledTimes(1);
    expect(relaunch.listener).toHaveBeenCalledWith(null);
    await expect(relaunch.provider.getAccessToken()).resolves.toBeNull();
    await expect(SecureStore.getItemAsync('auth.token')).resolves.toBeNull();
    expect(storage.contains('auth.pendingWipe')).toBe(false);
  });

  it('keeps the pending wipe when the delete fails again at launch, and stays signed out', async () => {
    const { provider } = await restored();
    await provider.signInWithPassword('ada@example.com', 'password123');
    secureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await provider.signOut();

    secureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    const relaunch = await restored();
    expect(relaunch.listener).toHaveBeenCalledWith(null);
    expect(storage.contains('auth.pendingWipe')).toBe(true);
  });

  it('stays signed out after delete account when storage is wiped and sign-out runs again', async () => {
    const { provider, listener } = await restored();
    await provider.signInWithPassword('ada@example.com', 'password123');
    secureStore.deleteItemAsync
      .mockRejectedValueOnce(new Error('keychain locked'))
      .mockRejectedValueOnce(new Error('keychain locked'));
    await provider.deleteAccount();
    // The settings screen wipes local storage after deletion, which drops the pending-wipe flag.
    storage.clearAll();
    // Signing out again while signed out is harmless: it reports null again and re-arms the flag.
    await expect(provider.signOut()).resolves.toBeUndefined();
    expect(listener).toHaveBeenLastCalledWith(null);
    expect(storage.contains('auth.pendingWipe')).toBe(true);

    const relaunch = await restored();
    expect(relaunch.listener).toHaveBeenCalledWith(null);
    expect(relaunch.listener).not.toHaveBeenCalledWith(devUser);
    await expect(SecureStore.getItemAsync('auth.token')).resolves.toBeNull();
  });

  it('leaves no pending wipe after a sign-out whose keychain delete succeeds', async () => {
    const { provider } = await restored();
    await provider.signInWithPassword('ada@example.com', 'password123');
    secureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await provider.signOut();
    expect(storage.contains('auth.pendingWipe')).toBe(true);

    await provider.signOut();
    expect(storage.contains('auth.pendingWipe')).toBe(false);
  });

  it('restores a sign-in made after a sign-out whose keychain delete failed', async () => {
    const { provider } = await restored();
    await provider.signInWithPassword('ada@example.com', 'password123');
    secureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await provider.signOut();
    await provider.signInWithPassword('ada@example.com', 'password123');

    const relaunch = await restored();
    expect(relaunch.listener).toHaveBeenCalledWith(devUser);
  });

  it('stays signed out when a sign-out lands while the first keychain read is pending', async () => {
    const read = deferred<string | null>();
    secureStore.getItemAsync.mockReturnValueOnce(read.promise);
    const { provider, listener } = subscribe();
    await provider.signOut();

    read.resolve('stored');
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(2));
    await settle();
    expect(listener).toHaveBeenLastCalledWith(null);
    await expect(provider.getAccessToken()).resolves.toBeNull();
  });

  it('still deletes the keychain token when a listener throws during sign-out', async () => {
    const { provider } = await restored();
    await provider.signInWithPassword('ada@example.com', 'password123');
    provider.onChange((user) => {
      if (user === null) throw new Error('listener boom');
    });
    secureStore.deleteItemAsync.mockClear();

    await expect(provider.signOut()).rejects.toThrow('listener boom');
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('auth.token', deviceOnly);
    await expect(SecureStore.getItemAsync('auth.token')).resolves.toBeNull();
  });

  it('keeps the token in SecureStore only, readable after first unlock and off backups', async () => {
    const { provider } = await restored();
    await provider.signInWithPassword('ada@example.com', 'password123');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('auth.token', 'dev-token', deviceOnly);
  });

  it('signs in with Google and with Apple in development', async () => {
    const { provider, listener } = await restored();
    await expect(provider.signInWithGoogle()).resolves.toBe('signed-in');
    expect(listener).toHaveBeenLastCalledWith(devUser);
    await provider.signOut();
    await expect(provider.signInWithApple()).resolves.toBe('signed-in');
    expect(listener).toHaveBeenLastCalledWith(devUser);
  });

  it('deleteAccount clears the session and the stored token', async () => {
    const { provider, listener } = await restored();
    await provider.signInWithPassword('ada@example.com', 'password123');
    await provider.deleteAccount();
    expect(listener).toHaveBeenLastCalledWith(null);
    await expect(SecureStore.getItemAsync('auth.token')).resolves.toBeNull();
  });

  it('refuses every way in, and ignores a stored token, in production builds', async () => {
    mockAppEnv = 'production';
    await SecureStore.setItemAsync('auth.token', 'stale');
    secureStore.setItemAsync.mockClear();
    const { provider, listener } = await restored();
    expect(listener).toHaveBeenCalledWith(null);
    await expect(provider.getAccessToken()).resolves.toBeNull();

    const signInWithPassword = provider.signInWithPassword('ada@example.com', 'password123');
    await expect(signInWithPassword).rejects.toBeInstanceOf(MockAuthRefusedError);
    await expect(provider.signInWithGoogle()).rejects.toBeInstanceOf(MockAuthRefusedError);
    await expect(provider.signInWithApple()).rejects.toBeInstanceOf(MockAuthRefusedError);
    await expect(provider.deleteAccount()).rejects.toBeInstanceOf(MockAuthRefusedError);
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
