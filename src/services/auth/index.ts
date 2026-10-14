import { mockAuthProvider } from './mock';
import type { AuthProvider } from './types';

/**
 * The active auth backend: an auth variant points this at its provider. A variant also changes the sign-in screen,
 * env, native config and tests; `docs/setup.md` step 6 is the starting point.
 */
export const authProvider: AuthProvider = mockAuthProvider;

export type { AuthProvider, AuthUser, SignInResult } from './types';
