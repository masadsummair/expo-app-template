export type AuthUser = { id: string; email: string | null; name: string | null };
export type SignInResult = 'signed-in' | 'cancelled';

/*
 * The one seam between the app and an auth backend. Screens and stores talk to this interface only,
 * except the dev sign-in form, which uses the mock directly until an auth variant replaces it;
 * `index.ts` picks the implementation. A provider owns its credentials (keychain, refresh): nothing
 * outside it stores a token.
 */
export interface AuthProvider {
  /**
   * Calls `cb` once with the restored session (`null` = signed out), then on every sign-in, sign-out
   * or session loss. Returns the unsubscribe. A new subscriber gets the current session once.
   */
  onChange(cb: (user: AuthUser | null) => void): () => void;
  /** Resolves 'cancelled' when the user dismisses the sheet; rejects on a real failure. */
  signInWithGoogle(): Promise<SignInResult>;
  /** iOS only: Apple requires it wherever Google sign-in is offered on iOS (App Review 4.8). */
  signInWithApple(): Promise<SignInResult>;
  /** Clears the local session even when the network or the keychain call fails. */
  signOut(): Promise<void>;
  /**
   * Deletes the account on the backend, then signs out. In-app deletion is required by App Review
   * 5.1.1(v) and expected by Google Play: hiding the account or only signing out is not enough.
   */
  deleteAccount(): Promise<void>;
  /**
   * A valid bearer token for the app's own API, or null when signed out. Asked per request: never cache it.
   * Must settle in bounded time (the request timeout starts after it).
   */
  getAccessToken(): Promise<string | null>;
}
