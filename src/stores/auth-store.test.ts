import { waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { useAuthStore } from './auth-store';

// Same in-memory keychain as test/setup.ts, plus the accessibility constant the store passes.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'after-first-unlock-this-device-only',
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
  };
});

const secureStore = jest.mocked(SecureStore);
const deviceOnly = { keychainAccessible: 'after-first-unlock-this-device-only' };

let onAppStateChange: (status: string) => void;
const removeListener = jest.fn();

beforeEach(async () => {
  removeListener.mockClear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, listener: never) => {
    onAppStateChange = listener;
    return { remove: removeListener };
  }) as never);
  // The failure-path tests report errors on purpose; keep the test output clean.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await useAuthStore.getState().signOut();
  useAuthStore.setState({ status: 'loading' });
});

describe('auth store', () => {
  it('hydrates signed-in from a stored token', async () => {
    await SecureStore.setItemAsync('auth.token', 'stored');
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', token: 'stored' });
  });

  it('falls back to signed-out when the keychain read fails, then reads again on the next foreground', async () => {
    await SecureStore.setItemAsync('auth.token', 'stored');
    secureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-out', token: null });

    onAppStateChange('active');
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signed-in'));
    expect(useAuthStore.getState().token).toBe('stored');
  });

  it('does not overwrite a session started after a failed hydrate when the app returns', async () => {
    secureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await useAuthStore.getState().hydrate();
    await useAuthStore.getState().signIn('fresh');
    secureStore.getItemAsync.mockClear();

    onAppStateChange('active');
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', token: 'fresh' });
  });

  it('cancels a pending hydrate retry on sign-out so a token that failed to delete is not read back', async () => {
    secureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await useAuthStore.getState().hydrate();
    expect(removeListener).not.toHaveBeenCalled();

    await useAuthStore.getState().signOut();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('signs out in memory even when the keychain delete fails', async () => {
    await useAuthStore.getState().signIn('t');
    secureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-out', token: null });
  });

  it('stores the token only in SecureStore', async () => {
    await useAuthStore.getState().signIn('secret');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('auth.token', 'secret', deviceOnly);
  });

  it('keeps the token off backups and readable after first unlock', async () => {
    await useAuthStore.getState().hydrate();
    expect(secureStore.getItemAsync).toHaveBeenCalledWith('auth.token', deviceOnly);
  });
});
