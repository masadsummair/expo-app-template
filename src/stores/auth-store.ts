import { create } from 'zustand';

import { reportError, setCrashUser } from '@/lib/crash-reporting';
import { authProvider } from '@/services/auth';
import type { AuthUser } from '@/services/auth/types';

type AuthState = {
  status: 'loading' | 'signed-in' | 'signed-out';
  user: AuthUser | null;
  /** Follows the auth provider's session. Returns the unsubscribe; the root layout calls it once. */
  connect: () => () => void;
  signOut: () => Promise<void>;
};

let signingOut: Promise<void> | null = null;

/*
 * Session state for the UI: who is signed in, or that nobody is. It holds no token: the auth provider
 * (src/services/auth) owns credentials, and the API client asks it for one per request.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  user: null,
  connect: () =>
    authProvider.onChange((user) => {
      // State first, so the app leaves `loading` even if crash reporting throws.
      set({ user, status: user ? 'signed-in' : 'signed-out' });
      setCrashUser(user);
    }),
  signOut: () => {
    // Repeats are ignored: a burst of 401s, or a 401 that lands after sign-out, signs out once.
    if (get().status === 'signed-out') return Promise.resolve();
    signingOut ??= authProvider
      .signOut()
      .catch((error: unknown) => reportError(error, { where: 'auth.signOut' }))
      .finally(() => {
        signingOut = null;
      });
    return signingOut;
  },
}));
