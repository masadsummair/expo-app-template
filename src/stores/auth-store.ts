import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { reportError } from '@/lib/crash-reporting';

const TOKEN_KEY = 'auth.token';

type AuthState = {
  status: 'loading' | 'signed-in' | 'signed-out';
  token: string | null;
  hydrate: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

/*
 * Session state. The token lives in the OS keychain/keystore (expo-secure-store),
 * never in MMKV or AsyncStorage. Swap signIn's caller for your auth provider.
 * Note: iOS keychain items survive an uninstall, so a reinstall can start signed in
 * with an old token — the API's 401 handling (src/lib/query-client.ts) signs it out.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  token: null,
  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      set({ token, status: token ? 'signed-in' : 'signed-out' });
    } catch (error) {
      // Keychain unavailable (e.g. device locked during a background launch): fall back to
      // signed-out instead of leaving the app stuck on `loading`.
      reportError(error, { where: 'auth.hydrate' });
      set({ token: null, status: 'signed-out' });
    }
  },
  signIn: async (token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, status: 'signed-in' });
  },
  signOut: async () => {
    // Update memory first so the UI signs out even if the keychain delete fails.
    set({ token: null, status: 'signed-out' });
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      reportError(error, { where: 'auth.signOut' });
    }
  },
}));
