# 0004 · Google sign-in library

Status: Accepted for the Supabase variant on emulator and simulator (spike S1); the Firebase variant is gated by PR7's device test · 2026-10-15

## Context

Both variants offer Google sign-in on iOS and Android and need a fresh ID token that carries our nonce (`auth.nonce`). Three libraries were compared:

- `react-native-nitro-google-signin` 2.3.0: Credential Manager on Android, the GoogleSignIn 10 SDK on iOS, supports a nonce. One maintainer; the package is about 4.5 months old.
- Universal Sign-In: its licence forbids use in templates.
- The free Original library: uses a deprecated Android API and has no nonce.

PR6 builds the `supabase` branch and PR7 the `firebase` branch.

## Decision

Use `react-native-nitro-google-signin` 2.3.0 and `react-native-nitro-modules`, both pinned to exact versions (`intake.pin-risky-native`; `package.json` pins nitro-modules to the tested `0.37.1`), behind one wrapper module so the library can be swapped. The wrapper and both variants follow these rules.

**Sign-in**

- Before each attempt, generate a raw nonce of at least 128 bits with `expo-crypto`.
  - Await its SHA-256 hex (`expo-crypto` hashes asynchronously), then call `configure({ webClientId, iosClientId, nonce: await sha256Hex(raw) })`.
  - `configure()` replaces the whole configuration (source reading), so always pass the client IDs too.
  - The library passes the nonce through unhashed.
- Call `createAccount()`, and fall back to `presentExplicitSignIn()` when it returns `noSavedCredentialFound`. S1 saw that result on Android; on iOS both methods opened the same Google sheet, so the fallback is harmless there. Attempts are serialised.
- Accept only `isSuccessResponse(result)` with a non-empty `idToken`. Send the ID token and the raw nonce to the backend.
- Keep the ID token and raw nonce in memory only in app code. (On Android the library itself also stores the ID token in its Keystore-encrypted `google_signin_prefs` while signed in, and `signOut()` removes it; this comes from the source.) Together they can be replayed (see Evidence), so never log or persist them, and never put them in query state or Sentry `extra`. As a second line of defence, the Sentry scrubber filters any key ending in `nonce` or `token`, plus JWTs in text. It cannot recognise an unlabelled nonce value.
- Drop `serverAuthCode`. iOS returned one without `offlineAccess` being set.

**Cached tokens**

These methods return the last ID token with its old nonce:

- iOS: `signIn()`, `getTokens()` and `getCurrentUser()`;
- Android: `getTokens()` and `getCurrentUser()`.

They may show who is signed in. They are never sent to a backend. Android `signIn()` was not tested; it is treated the same way.

**Identity** (from provider documentation, not tested in S1; the server-side checks are for apps that add their own server, per ADR 0002)

- Key all app data on the backend user id (`auth.uid()` on Supabase, the Firebase uid). Never key it on email.
- Do not enable email or magic-link sign-in next to Google without reviewing automatic account linking. Someone who registers the victim's email first could keep access after the victim's Google sign-in is linked to that account.
- A Workspace domain (`hd`) restriction is optional, and the template ships without one. An app that needs it checks `hd` on the server only, never on the device. On Supabase that is an auth hook. On Firebase it is a blocking function, which needs Identity Platform and the paid Blaze plan; there is no free Firebase path.

**Errors**

- Errors reach JS as a plain `Error` with `code: null`, and the native code is only in the message.
- Read `{ type: 'cancelled' }` and `noSavedCredentialFound` from the response type, and treat every thrown error as one generic failure. Do not branch on message text; Android's offline error even gives misleading SHA-1 advice.
- Error messages reach Sentry only through the scrubber in `src/lib/crash-reporting.ts`.
- Record every `cancelled` as a breadcrumb without PII. On Android, a wrong SHA-1 or package name can come back as `cancelled`, even after an account is picked. That comes from the library source and was not tested in S1. Without the breadcrumb, a broken release would look like users cancelling.

**Sign-out**

- Clear the local session first, so sign-out works offline (the `AuthProvider` contract).
- Then call `signOut()`.
- On Android, `signOut()` leaves the email, profile and scopes in the library's encrypted preferences, `google_signin_prefs`. This comes from reading the source; S1 could not open Android app storage.
- `revokeAccess()` removes that data. It was not run in S1, and what follows comes from the source:
  - It is a network call that revokes the app's grant, so the next sign-in asks for consent again.
  - On iOS it throws `signInRequired` unless the library has a current user, and the argument must match that user.
  - After `signOut()` there is no current user (seen in S1).
  - After a cold start there is none until `signIn()` restores it. The restore was seen in S1, after the app's own `configure()`. That there is no user before it comes from the source and was not observed.
  - **iOS:** before `revokeAccess()`, read `getCurrentUser()`. If it is null:
    - call `configure()` first (iOS `signIn()` throws `notConfigured` without it);
    - then call `signIn()` to restore the user, and discard the token it returns.

    Then call `revokeAccess(id)` with the user's Google `id`, then `signOut()`.

  - **Android:** do not call `signIn()`, because it shows the account sheet. `revokeAccess()` finds the account in the library's stored preferences. Pass the Google `id` from `getCurrentUser()`, or the one stored at sign-in.
  - Use it on account deletion, and on sign-out only if the app wants consent asked again. ADR 0003 sets the deletion order for the Supabase variant. PR7 sets it for Firebase, whose deletion re-authenticates first.
  - It is best effort, with a timeout: neither a failure nor a hang blocks deletion or local sign-out. It awaits a network call on both platforms.

**Supabase**

- Keep the nonce check on (`skip_nonce_check = false`). [Supabase's Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google) suggests turning it off for iOS native sign-in. That comes from the research step on 2026-10-15, not from S1. S1 shows iOS passes with the check on.
- The token's `aud` was the Web client ID on both platforms. PR6 tests whether listing only the Web client ID is enough; S1 listed all three.

**Supply chain**

- The podspec takes `GoogleSignIn ~> 10.0`, and `ios/` is generated, so there is no `Podfile.lock` to commit. Pin the resolved GoogleSignIn version through `expo-build-properties` `ios.extraPods`, which accepts a pod version. S1 did not try this; the variant PR that adds the library does.
- Do not load the package's `skills/` folder or its `AGENTS.md` into agent context. Both tell agents to run a global `npx skills add`.

## Evidence

Spike S1 ran on 2026-10-15. Setup:

- **Google:** a throwaway Google Cloud project.
- **Backend:** a local Supabase CLI stack, Supabase Auth (GoTrue) v2.197.0, with the nonce check on.
- **App:** Expo SDK 57, React Native 0.86.3, nitro-modules 0.37.1.
- **Builds:** an Android release build with R8 minification (`minifyReleaseWithR8` ran) on an emulator (Play image), and an iOS Release simulator build (iOS 26.2). Every Android row below comes from that R8 build, so sign-in works under R8. The one exception is marked as from the debug build. R8 needed no extra keep rules: the library ships a `consumer-rules.pro`, and the app's `proguard-rules.pro` was the unmodified prebuild default.

Device results:

| Check                                                          | Android                                                                                                                                                                                                      | iOS                                                                                                                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createAccount()` with our hashed nonce                        | success; token `nonce` matches; `aud` is the Web client                                                                                                                                                      | same; a `serverAuthCode` was also returned                                                                                                                                                                 |
| `presentExplicitSignIn()`                                      | success; nonce matches                                                                                                                                                                                       | success; nonce matches                                                                                                                                                                                     |
| Supabase `signInWithIdToken` with that token and the raw nonce | accepted                                                                                                                                                                                                     | accepted                                                                                                                                                                                                   |
| Cached methods after a new `configure()`                       | `getTokens()` and `getCurrentUser()`: old token, old nonce                                                                                                                                                   | `signIn()`, `getTokens()` and `getCurrentUser()`: old token, old nonce. After a relaunch, `signIn()` restored the user and returned the old token; the other two, called after it, returned the same token |
| Supabase with a cached token                                   | `AuthApiError` "Nonces mismatch", 400                                                                                                                                                                        | same                                                                                                                                                                                                       |
| Wrong Web client ID                                            | account on device: `Error` "[28444] Developer console is not set up correctly"; no account (debug build): the fallback opened Google's add-account flow, and `cancelled` came from the tester pressing Back  | account chooser opens, then `Error` `invalid_audience`                                                                                                                                                     |
| User cancels                                                   | `{ type: 'cancelled', data: null }`                                                                                                                                                                          | same                                                                                                                                                                                                       |
| Offline                                                        | account on device: `Error` "[28404] Failed to retrieve an ID token"; no account: `cancelled` after the user pressed Back on Google's add-account error page, so this shows a user cancel, not offline itself | not run                                                                                                                                                                                                    |
| After `signOut()`                                              | `getCurrentUser()` null; `getTokens()` throws                                                                                                                                                                | same; `signIn()` returns `noSavedCredentialFound`                                                                                                                                                          |

With a wrong Web client ID and an account on the device, Android threw `[28444]`. With no account, S1 only reached Google's add-account screen, and the `cancelled` there was a user cancel. No misconfiguration was seen to produce `cancelled` by itself. A wrong Web client ID, SHA-1 or package name could still come back as `cancelled`, even with an account (source reading, not tested).

**Supabase id_token grant probes**

These were sent from the Android build with a fresh token, 11 seconds old.

- The token with the raw nonce is accepted.
- **The identical request sent a second time is also accepted.** GoTrue v2.197.0 has no store of used nonces (source reading), so treat a stolen token and nonce pair as valid until the token's `exp`.
- These were rejected with 400:
  - no nonce;
  - the hashed nonce instead of the raw one;
  - another raw nonce;
  - one signature character changed;
  - the payload email changed;
  - `alg: none`;
  - `provider: 'apple'` with a Google token;
  - an empty token.

**Logs and storage**

- No ID token, access token or auth code appeared in logcat (all tags) or in the iOS app's unified log. The only email line came from Google Play services (AppSearch), not from the app or the library.
- On iOS the library itself writes nothing to the app container; see the HTTP cache finding under Consequences.

**Not covered**

- physical devices;
- the iOS cached token after expiry;
- Play App Signing and upload-key SHA-1s (S1 signed debug and release with the same key; Play Console is a paid account, needed only to publish on Play);
- TestFlight (needs the paid Apple Developer Program, needed only to ship on iOS);
- hosted Supabase;
- Firebase;
- `revokeAccess()`, on either platform;
- Android `signIn()`;
- iOS offline;
- a wrong SHA-1 or package name;
- Supabase `signOut()`.

## Consequences

PR6 and PR7 are not done until each item below that names them ships with a test.

- **iOS HTTP cache (blocks PR6).** On iOS, the Supabase sign-in call was written in plain text to `Library/Caches/<bundle id>/Cache.db`, both the request and the response.
  - The request holds the Google ID token and the raw nonce, which is the replayable pair.
  - The response holds the access token, the refresh token and the email.

  This bypasses `core.tokens-in-keychain` and ADR 0006. The cause has two parts:
  - the local GoTrue v2.197.0, behind the local Kong gateway, sends no `Cache-Control: no-store` (research: supabase/auth PR #2217, which would add it, was closed unmerged on 2025-12-03);
  - React Native's iOS networking uses the default `URLCache`.

  `fetch`'s `cache: 'no-store'` should not change this for a POST. That is reasoning from React Native's networking source, not tested in S1. PR6 must:
  - disable the URL cache for every request through a config plugin, before React Native opens its first session;
  - test that the whole `Cache.db` file, requests and responses, contains no `id_token`, `nonce`, `access_token`, `refresh_token` or email after sign-in, refresh and `getUser()`;
  - delete any `Cache.db` left from an earlier install;
  - re-check the headers on a hosted Supabase project.

  On Android, OkHttp skips non-GET responses (source reading); Android storage was not inspected.

- **Supabase sign-out (PR6).** This comes from reading the source of `@supabase/auth-js` 2.117.3; S1 did not test sign-out.
  - `signOut()` removes the local session even when its network call fails.
  - It has no timeout of its own. When the client has a lock configured, `signOut()` runs inside it, so a hanging network can also block `getSession()` and token refresh until the call fails.
  - When the call fails, the server-side session is not revoked, and the access JWT stays valid until it expires.

  In 2.117.3, with scope `global` or `local`, the local session is removed only after the network call settles. With scope `others` it is never removed. A timeout around `signOut()` would stop the caller waiting, but the stored session would stay until the hung call fails.

  PR6 re-checks this against the version it pins. Then:
  - It clears the stored session itself, without waiting for the network, so the `AuthProvider` contract holds offline.
  - It sends the server revoke as best effort, with a timeout.
  - It picks the scope (`global` or `local`) on purpose.

- **Android backups (PR6, PR7).** The `expo-secure-store` plugin's rules back up every shared-preferences file except `SecureStore` (read from its rules XML). So `google_signin_prefs` is backed up by default.
  - Each variant must exclude it. That means setting the plugin's `configureAndroidBackup: false` and shipping its own backup and data-extraction rules, which keep the `SecureStore` exclusion.
  - The prefs are encrypted with an AndroidKeyStore key that stays on the device, so a restored copy should not be readable (source reading, not tested). Excluding them still keeps the email, and while signed in the ID token, out of backups.
  - MMKV lives outside shared preferences, so these rules do not back it up.
- **Firebase (PR7).**
  - The plain `GoogleAuthProvider.credential(idToken)` helper takes no nonce (research), and this library always puts one in the token. Whether Firebase accepts such a token is unverified.
  - If Firebase accepts it without checking the nonce, "never send a cached token" is the only replay defence, and PR7 says so.
  - If a credential with `rawNonce` exists in RNFB 26.4 (to be confirmed against its types), PR7 adds a test that a wrong `rawNonce` is rejected.
  - Firebase cannot revoke a session server-side without the Admin SDK (research, not tested). PR7 documents this.
- **Android OAuth clients (release routine).** S1 did not test this. Register one Android OAuth client per signing certificate. That means the release keystore, plus the Play App Signing certificate only if you publish through Play, which needs a paid Play Console account. Use separate Google Cloud and backend projects for development and production, and register the debug SHA-1 in the development project only. The debug keystore is public. If its Android client sat in the same project as the production Web client, a look-alike app signed with that key could get tokens your production backend accepts. Separate projects cost nothing on Google Cloud without billing enabled (research; S1's project had no billing). `docs/auth/google-setup.md` gives the steps.
- **Revisit** after 90 days without a release, if Universal's licence changes, or if the Original library merges nonce support and Credential Manager. The `google-signin-library` pattern doc explains how to switch.
