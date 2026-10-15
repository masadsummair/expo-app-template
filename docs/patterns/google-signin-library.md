# Google sign-in library: nitro, Original and Universal

Optional pattern. It records the comparison behind the library choice and how to switch.

## Concept

Three libraries cover native Google sign-in in React Native:

- **`react-native-nitro-google-signin`** (2.3.0 at the time of writing). Uses Credential Manager on Android and the GoogleSignIn 10 SDK on iOS, and supports a nonce. One maintainer, a young package. This is the chosen library for the Supabase variant (ADR 0004, confirmed by spike S1 on an Android emulator and an iOS simulator). The Firebase variant is gated by PR7's device test.
- **`@react-native-google-signin/google-signin`, free "Original".** Uses the deprecated Android sign-in API and has no nonce support.
- **The same author's paid "Universal".** Its licence forbids use in a template.

Behaviour of nitro 2.3.0 (details and the full rules in ADR 0004).

Confirmed by spike S1 on an Android emulator and an iOS simulator:

- These return the last ID token with its old nonce, so never send their token to a backend:
  - iOS: `signIn()`, `getTokens()` and `getCurrentUser()`;
  - Android: `getTokens()` and `getCurrentUser()`. Android `signIn()` was not tested; treat it the same and never send its token.
- The library does not hash the nonce. Pass the SHA-256 hex of the raw nonce to `configure()` and the raw nonce to the backend.
- `configure()` can be called again at runtime, so configure right before each attempt and serialise attempts.
- Errors reach JavaScript as a plain `Error` with `code: null`, and the native code is only in the message. A cancel is `{ type: 'cancelled' }`.
- A wrong Web client ID throws: `[28444]` on Android, `invalid_audience` on iOS. On Android, that throw needs a Google account on the device. With no account, S1 only reached Google's add-account screen.
- iOS returned a `serverAuthCode` without `offlineAccess` being set. Drop it.

From reading the source (not observed on a device):

- On Android, `signOut()` leaves the email and profile in the library's encrypted preferences, and `revokeAccess()` removes them.
- The Android cached token is not checked for expiry.

## Example

Keep the library behind one wrapper that exposes only what the app needs, so a switch touches one file:

```ts
type GoogleResult = { idToken: string; nonce: string } | 'cancelled';

export async function signInWithGoogleNative(): Promise<GoogleResult> {
  const nonce = randomNonce();
  // expo-crypto hashes asynchronously; configure only once the hash is ready.
  const hashedNonce = await sha256Hex(nonce);
  GoogleOneTapSignIn.configure({ webClientId, iosClientId, nonce: hashedNonce });
  let result = await GoogleOneTapSignIn.createAccount();
  if (result.type === 'noSavedCredentialFound') {
    result = await GoogleOneTapSignIn.presentExplicitSignIn();
  }
  if (result.type === 'cancelled') return 'cancelled';
  if (!isSuccessResponse(result) || !result.data.idToken) throw new Error('Google sign-in failed');
  return { idToken: result.data.idToken, nonce };
}
```

Notes on the example:

- **Names:** `GoogleOneTapSignIn`, `createAccount`, `presentExplicitSignIn`, `isSuccessResponse` and the response types exist in the 2.3.0 types. The example type-checks against them, but S1 ran only its `createAccount()` and `presentExplicitSignIn()` fallback, not the example as a whole. `data` is typed as nullable, so the guard narrows it. Android ignores `iosClientId`.
- **Left out for brevity:** imports, serialising attempts, and mapping thrown errors to one generic failure. The wrapper must do all three (ADR 0004).
- **Fallback:** S1 saw `noSavedCredentialFound` on Android. On iOS both methods opened the same Google sheet, so the fallback is harmless there.
- **Helpers:** `randomNonce()` and `sha256Hex()` are app helpers.
  - `randomNonce()` draws at least 128 random bits with `expo-crypto` (`getRandomBytes`).
  - `sha256Hex()` returns a `Promise<string>`, because `expo-crypto`'s `digestStringAsync` is asynchronous.
  - Keep the raw nonce and the token in memory only.

To switch: re-implement the wrapper on the new library, map its cancel and error shapes to the same result, re-check the nonce rules (whether it hashes, whether it can return a cached token), then re-run the sign-in, sign-out and deletion checks on both platforms.

## Limitations

- Pin the library exactly while it is pre-1.0 or has a bus factor of one.
- Revisit after 90 days without a release, if Universal's licence changes, or if Original gains nonce support and Credential Manager.

## Scope

- Fits: an app that needs native Google sign-in with a nonce-checking backend.
- Does not fit: apps that only use browser OAuth (see that pattern).
