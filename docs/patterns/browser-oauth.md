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

`base64Url` and `buildAuthorizeUrl` are small helpers you write. UNVERIFIED: the exact `expo-crypto` digest signature at your SDK version; read the versioned docs.

## Limitations

- iOS shows a system prompt ("wants to use ... to sign in") before the browser opens, and the flow leaves the app, so it feels slower than a native sheet.
- A custom URL scheme can be claimed by another app. Prefer universal links or Android App Links for the redirect where the provider allows it.
- Google blocks embedded WebViews. Use the system browser session only.
- App Review Guideline 4.8 still applies if you offer a third-party login on iOS.
- Nonce and audience handling depend on the provider. Verify the backend accepts the token you get.

## Scope

- Fits: providers with no maintained native SDK, or when the native library is a risk you do not want to take.
- Does not fit: Google and Apple when a native flow exists and the sign-in speed matters. The template's chosen path is the native flow.
