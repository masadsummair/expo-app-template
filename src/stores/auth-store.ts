import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { reportError } from '@/lib/crash-reporting';

const TOKEN_KEY = 'auth.token';

// Readable in the background after first unlock, and never restored onto another device from a backup.
const keychain = () => ({ keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });

let retry: { remove: () => void } | null = null;

function cancelRetry() {
  retry?.remove();
  retry = null;
}

/** Runs `hydrate` once on the next foreground, unless a retry is already waiting. */
function retryOnActive(hydrate: () => Promise<void>) {
  if (retry) return;
  retry = AppState.addEventListener('change', (status) => {
    if (status !== 'active') return;
    cancelRetry();
    if (useAuthStore.getState().status !== 'signed-in') void hydrate();
  });
}

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
export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  token: null,
  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY, keychain());
      set({ token, status: token ? 'signed-in' : 'signed-out' });
    } catch (error) {
      // Keychain unavailable (e.g. device locked during a background launch): show sign-in
      // instead of leaving the app stuck on `loading`, and read the keychain again on return.
      reportError(error, { where: 'auth.hydrate' });
      if (get().status === 'loading') set({ token: null, status: 'signed-out' });
      retryOnActive(get().hydrate);
    }
  },
  signIn: async (token) => {
    cancelRetry();
    await SecureStore.setItemAsync(TOKEN_KEY, token, keychain());
    set({ token, status: 'signed-in' });
  },
  signOut: async () => {
    // A pending hydrate retry must not read a token that failed to delete back in after an explicit sign-out.
    cancelRetry();
    // Update memory first so the UI signs out even if the keychain delete fails.
    set({ token: null, status: 'signed-out' });
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY, keychain());
    } catch (error) {
      reportError(error, { where: 'auth.signOut' });
    }
  },
}));
