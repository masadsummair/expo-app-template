import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { env } from '@/config/env';
import { reportError } from '@/lib/crash-reporting';
import { storage } from '@/lib/storage';

import type { AuthProvider, AuthUser, SignInResult } from './types';

const TOKEN_KEY = 'auth.token';
// Non-secret MMKV flag: a sign-out whose keychain delete failed, so the next launch must not restore.
const PENDING_WIPE_KEY = 'auth.pendingWipe';
const DEV_TOKEN = 'dev-token';
const DEV_USER: AuthUser = { id: 'dev-user', email: 'dev@example.com', name: null };

// Readable in the background after first unlock, and never restored onto another device from a backup.
const keychain = () => ({ keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });

// An unset APP_ENV in a release build counts as production (src/config/env.ts); release builds for e2e
// set EXPO_PUBLIC_APP_ENV=development explicitly. Read per call so tests can change it.
const isProduction = () => env.APP_ENV === 'production';

/** Every way into the mock throws this in a production build: it accepts any credentials. */
export class MockAuthRefusedError extends Error {
  constructor() {
    super('The mock auth provider accepts any credentials, so production builds refuse it.');
    this.name = 'MockAuthRefusedError';
  }
}

export type MockAuthProvider = AuthProvider & {
  /** The dev and e2e sign-in form. Any credentials work. Not part of `AuthProvider`. */
  signInWithPassword(email: string, password: string): Promise<SignInResult>;
};

/*
 * Development stand-in for a real provider: a fixed dev user and a fake token kept in the OS keychain
 * (expo-secure-store), never in MMKV or AsyncStorage. The token is read and written in this file only.
 * Swap `authProvider` in ./index.ts for your backend.
 * There is no server account: `deleteAccount` only clears the local session and keychain token.
 * A real provider must delete the account remotely.
 * Note: iOS keychain items survive an uninstall, so a reinstall can start signed in with an old
 * session; the API's 401 handling (src/lib/query-client.ts) signs it out.
 */
export function createMockAuthProvider(): MockAuthProvider {
  const listeners = new Set<(user: AuthUser | null) => void>();
  let user: AuthUser | null = null;
  let token: string | null = null;
  let started = false;
  let restored = false;
  let retry: { remove: () => void } | null = null;
  // Bumped by every sign-in and sign-out: a restore that started before one of them drops its result.
  let generation = 0;

  const emit = () => listeners.forEach((listener) => listener(user));

  function cancelRetry() {
    retry?.remove();
    retry = null;
  }

  /** Runs `restore` once on the next foreground, unless a retry is already waiting. */
  function retryOnActive() {
    if (retry) return;
    retry = AppState.addEventListener('change', (status) => {
      if (status !== 'active') return;
      cancelRetry();
      if (user === null) void restore();
    });
  }

  /** Deletes a token a failed sign-out left behind. Clears the flag only once the delete succeeds. */
  async function finishPendingWipe() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY, keychain());
      storage.remove(PENDING_WIPE_KEY);
    } catch (error) {
      reportError(error, { where: 'auth.pendingWipe' });
    }
  }

  async function restore() {
    const before = user;
    const startedAt = generation;
    try {
      // No generation check needed: the sign-in form appears only after the first restore emits (`Stack.Protected` while `status` is `loading`), so no sign-in lands during this delete.
      if (storage.getBoolean(PENDING_WIPE_KEY)) {
        // The last sign-out could not delete the token: finish it and stay signed out.
        await finishPendingWipe();
      } else {
        const stored = isProduction()
          ? null
          : await SecureStore.getItemAsync(TOKEN_KEY, keychain());
        // A sign-in or sign-out that started while the keychain was being read wins.
        if (stored && generation === startedAt) {
          token = stored;
          user = DEV_USER;
        }
      }
    } catch (error) {
      // Keychain unavailable (e.g. device locked during a background launch): report signed out
      // instead of leaving the app on `loading`, and read the keychain again on return.
      reportError(error, { where: 'auth.restore' });
      retryOnActive();
    }
    const first = !restored;
    restored = true;
    if (first || user !== before) emit();
  }

  function refuseInProduction() {
    if (isProduction()) throw new MockAuthRefusedError();
  }

  async function signInDev(): Promise<SignInResult> {
    refuseInProduction();
    generation += 1;
    await SecureStore.setItemAsync(TOKEN_KEY, DEV_TOKEN, keychain());
    // The new token replaced any one a failed sign-out left behind: the next launch may restore it.
    storage.remove(PENDING_WIPE_KEY);
    token = DEV_TOKEN;
    user = DEV_USER;
    emit();
    return 'signed-in';
  }

  async function signOut() {
    // A pending restore retry must not read back a token that failed to delete after an explicit sign-out.
    cancelRetry();
    generation += 1;
    // Update memory first so a failed keychain delete still signs out.
    token = null;
    user = null;
    try {
      // The UI signs out at once; the finally still deletes the token if a listener throws.
      emit();
    } finally {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY, keychain());
        storage.remove(PENDING_WIPE_KEY);
      } catch (error) {
        reportError(error, { where: 'auth.signOut' });
        // The token is still in the keychain: the next launch deletes it instead of restoring it.
        storage.set(PENDING_WIPE_KEY, true);
      }
    }
  }

  return {
    onChange(listener) {
      listeners.add(listener);
      if (!started) {
        started = true;
        void restore();
      } else if (restored) {
        listener(user);
      }
      return () => {
        listeners.delete(listener);
      };
    },
    signInWithPassword: () => signInDev(),
    signInWithGoogle: () => signInDev(),
    signInWithApple: () => signInDev(),
    signOut,
    async deleteAccount() {
      refuseInProduction();
      await signOut();
    },
    getAccessToken: () => Promise.resolve(token),
  };
}

export const mockAuthProvider = createMockAuthProvider();
