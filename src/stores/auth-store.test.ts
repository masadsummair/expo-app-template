import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from './auth-store';

const secureStore = jest.mocked(SecureStore);

beforeEach(async () => {
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

  it('falls back to signed-out when the keychain read fails, instead of staying on loading', async () => {
    secureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-out', token: null });
  });

  it('signs out in memory even when the keychain delete fails', async () => {
    await useAuthStore.getState().signIn('t');
    secureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-out', token: null });
  });

  it('stores the token only in SecureStore', async () => {
    await useAuthStore.getState().signIn('secret');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('auth.token', 'secret');
  });
});
