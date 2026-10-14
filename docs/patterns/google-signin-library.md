# Google sign-in library: nitro, Original and Universal

Optional pattern. It records the comparison behind the library choice and how to switch.

## Concept

Three libraries cover native Google sign-in in React Native:

- **`react-native-nitro-google-signin`** (2.3.0 at the time of writing). Uses Credential Manager on Android and the GoogleSignIn 10 SDK on iOS, and supports a nonce. One maintainer, a young package. This is the candidate; confirm on a device before relying on it.
- **`@react-native-google-signin/google-signin`, free "Original".** Uses the deprecated Android sign-in API and has no nonce support.
- **The same author's paid "Universal".** Its licence forbids use in a template.

Findings from a static audit of nitro 2.3.0, each to be confirmed on a device:

- On iOS `signIn()`, and on Android `getTokens()` and `getCurrentUser()`, return cached ID tokens that do not carry the new nonce.
- The library does not hash the nonce; hash it yourself.
- Native error codes do not reach JavaScript, and an Android misconfiguration reports as `cancelled`.
- `configure()` can be called again at runtime, so configure right before each attempt and serialise attempts.
- Android keeps the email and profile of the last user after sign-out.

## Example

Keep the library behind one wrapper that exposes only what the app needs, so a switch touches one file:

```ts
type GoogleResult = { idToken: string; nonce: string } | 'cancelled';

export async function signInWithGoogleNative(): Promise<GoogleResult> {
  const nonce = randomNonce();
  GoogleSignin.configure({ webClientId, iosClientId, nonce: sha256Hex(nonce) });
  const result = await GoogleSignin.presentExplicitSignIn();
  if (result.type === 'cancelled') return 'cancelled';
  return { idToken: result.data.idToken, nonce };
}
```

UNVERIFIED: the method and result names above follow the nitro audit notes; read the installed version's types.

To switch: re-implement the wrapper on the new library, map its cancel and error shapes to the same result, re-check the nonce rules (whether it hashes, whether it can return a cached token), then re-run the sign-in, sign-out and deletion checks on both platforms.

## Limitations

- Pin the library exactly while it is pre-1.0 or has a bus factor of one.
- Revisit after 90 days without a release, if Universal's licence changes, or if Original gains nonce support and Credential Manager.

## Scope

- Fits: an app that needs native Google sign-in with a nonce-checking backend.
- Does not fit: apps that only use browser OAuth (see that pattern).
