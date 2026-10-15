# Apple token revocation

Optional pattern. Apply it only when you choose it. It needs a paid Apple Developer Program membership (for the `.p8` key) and a server on the Supabase path, so skip it when trying the template without Apple sign-in.

## Concept

An app that offers Sign in with Apple must let users delete their account inside the app (App Review Guideline 5.1.1(v)). Apple also says the app "should" revoke the user's Sign in with Apple token when it does ([Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/)); TN3194 covers the manual fallback. Revocation is a call to Apple's revoke endpoint. It needs a client secret: a JWT signed with the `.p8` key from your developer account. That key has to live on a server. A key inside the app is readable by anyone who downloads the app.

## Example

1. At sign-in, keep the `authorizationCode` Apple returns. It is single use and short lived (about five minutes).
2. Send it to your server. The server exchanges it at `https://appleid.apple.com/auth/token` for a refresh token and stores that token against the user.
3. At account deletion the server revokes the stored token:

```ts
const body = new URLSearchParams({
  client_id: bundleId,
  client_secret: signedJwt, // ES256, signed with the .p8 key, aud https://appleid.apple.com
  token: refreshToken,
  token_type_hint: 'refresh_token',
});
await fetch('https://appleid.apple.com/auth/revoke', { method: 'POST', body });
```

4. Only after that, delete the user's data and the account.

The client secret JWT may live at most six months. Sign a fresh one per call.

## Limitations

- It needs server code. A server-free app has to pick a backend that can revoke for it, or add this piece.
- If the authorization code was not captured at sign-in, your server holds no token to revoke. The user has to sign in with Apple again first. TN3194 says you must still honor the deletion; as a fallback, delete the data and direct the user to revoke the app in Settings.
- Skipping revocation leaves the app listed under Settings, your name, Sign in with Apple. Apple says apps "should" revoke; whether App Review rejects an update for skipping it is not documented.
- Firebase "does not store user tokens" ([Firebase](https://firebase.google.com/docs/auth/ios/apple)), so re-authenticate with Apple before revoking. Whether Supabase's built-in Apple provider stores the refresh token: UNVERIFIED. Read its docs before writing your own server.

## Scope

- Fits: Sign in with Apple on a backend whose client SDK cannot revoke (for example Supabase).
- Does not fit: a backend whose SDK revokes from the client after re-authentication (for example Firebase; it still needs the Services ID, Team ID, Key ID and `.p8` entered in the Firebase console, so a paid membership), apps without Apple sign-in, Android.
