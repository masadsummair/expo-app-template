# Browser OAuth with PKCE

Optional pattern. Apply it only when you choose it.

## Concept

Instead of a native sign-in SDK, open the provider's login page in the system browser session and finish with the OAuth 2.0 authorization code flow plus PKCE. The app creates a random `code_verifier`, sends its SHA-256 `code_challenge` with the request, receives a one-time `code` on a redirect back into the app, and exchanges code plus verifier for tokens. The session is an `ASWebAuthenticationSession` on iOS and a Custom Tab on Android, opened through `expo-web-browser`.

## Example

```ts
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

const verifier = base64Url(Crypto.getRandomBytes(32));
const challenge = base64Url(
  await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new TextEncoder().encode(verifier)),
);
const state = base64Url(Crypto.getRandomBytes(16));

const result = await WebBrowser.openAuthSessionAsync(
  buildAuthorizeUrl({ challenge, state, redirectUri }),
  redirectUri,
);
if (result.type !== 'success') return 'cancelled';

const params = new URL(result.url).searchParams;
if (params.get('state') !== state) throw new Error('State mismatch');
// POST params.get('code') and verifier to the token endpoint.
```

`base64Url` and `buildAuthorizeUrl` are small helpers you write. The `expo-crypto` calls match SDK 57: `digest(algorithm, data: BufferSource): Promise<ArrayBuffer>` and `getRandomBytes(n): Uint8Array` ([source](https://github.com/expo/expo/blob/sdk-57/packages/expo-crypto/src/Crypto.ts)). `URL.searchParams` is polyfilled by Expo's runtime (`expo/src/winter/url.ts`). Re-check both at other SDK versions.

## Limitations

- iOS shows a system prompt ("wants to use ... to sign in") before the browser opens, and the flow leaves the app, so it feels slower than a native sheet.
- A custom URL scheme can be claimed by another app. Prefer universal links or Android App Links for the redirect where the provider allows it. Google no longer supports custom URI scheme redirects on Android ([Google](https://developers.google.com/identity/protocols/oauth2/native-app)).
- Google blocks embedded WebViews. Use the system browser session only.
- App Review Guideline 4.8 can still apply if a third-party login sets up or authenticates the user's primary account on iOS, with exemptions (see `docs/auth/apple-setup.md`).
- Nonce and audience handling depend on the provider. Verify the backend accepts the token you get.

## Scope

- Fits: providers with no maintained native SDK, or when the native library is a risk you do not want to take.
- Does not fit: Google and Apple when a native flow exists and the sign-in speed matters. The template's chosen path is the native flow.
