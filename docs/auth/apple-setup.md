# Sign in with Apple setup

Provider-neutral. iOS only: the app offers Apple sign-in on iOS and not on Android.

Cost: the Sign in with Apple capability needs a paid Apple Developer Program membership ([Apple](https://developer.apple.com/help/account/reference/supported-capabilities-ios)). Firebase says Apple sign-in can only be configured by program members ([Firebase](https://firebase.google.com/docs/auth/ios/apple)); that this also blocks testing is inferred. It is optional for trying the template without Apple sign-in. UNVERIFIED: whether a simulator-only build with your own bundle ID works without membership.

## Why

App Review Guideline 4.8 applies when an iOS app uses a third-party or social login, such as Google, to set up or authenticate the user's primary account. Exemptions include apps that use only the company's own accounts, education or enterprise apps, government or industry ID, and clients for a specific third-party service. Sign in with Apple is one acceptable equivalent login, not the only one ([guidelines](https://developer.apple.com/app-store/review/guidelines/)). Guideline 5.1.1(v) requires in-app account deletion; see the last section.

## 1. Capability

1. Apple Developer, Certificates, Identifiers & Profiles, Identifiers.
2. Open the App ID of each build variant (development, preview, production) and enable **Sign In with Apple**.
3. In the app config, turn on Sign in with Apple for iOS and add the `expo-apple-authentication` config plugin. The entitlement is generated at prebuild; never edit the native iOS project by hand.
4. Rebuild. Changing a capability invalidates provisioning profiles, so let EAS regenerate them (`bun run eas credentials`) before the next build.

## 2. Provider configuration

- The native flow identifies the app by its **bundle ID**. Enter the bundle ID of every variant in the backend's Apple provider settings as the client ID. Supabase's native `signInWithIdToken` accepts any client ID in its Client IDs list ([Supabase](https://supabase.com/docs/guides/auth/social-login/auth-apple)). Firebase: UNVERIFIED.
- A backend that revokes tokens for you (see the last section) also needs the Team ID, a Key ID and the `.p8` key. That secret is entered in the backend's dashboard, never in the app.
- A Services ID and a return URL are needed for browser-based Apple sign-in, which this app does not use. The exception is Firebase: its revocation setup needs the Services ID and the OAuth code flow configuration (Team ID, Key ID, `.p8`) in the Firebase console.

## 3. Nonce

1. Generate a random raw nonce for every attempt.
2. Pass its SHA-256 (hex) to Apple as the request `nonce`. Apple puts that hash in the identity token.
3. Pass the **raw** nonce to the backend with the identity token. The backend hashes it and compares.

## 4. Name capture

Apple returns the user's name only on the **first** authorization of the app for that Apple ID; later sign-ins return `null`. The email is absent from the credential object on later sign-ins, but Apple still includes it in the identity token ([Apple](https://developer.apple.com/documentation/signinwithapple/authenticating-users-with-sign-in-with-apple)).

1. Save the name in the same step as the first sign-in (a profile update on the backend, or the SDK's profile call).
2. To test the first-run path again, remove the app from Settings, your name, Sign in with Apple on the test device ([Apple](https://support.apple.com/en-us/102571)).
3. "Hide My Email" users arrive with a relay address. Configure outbound email for relay delivery if you send email.

## 5. Testing on a device

- Test on a real iPhone signed in to an Apple ID. Expo describes Simulator testing as "limited" and recommends a real device ([Expo](https://docs.expo.dev/versions/v57.0.0/sdk/apple-authentication/)); do not rely on the Simulator for the final check.
- The Apple sheet cannot be automated. End-to-end tests use the email and password form of the test environment.
- Check on a device: first sign-in with the name captured, a cold-start restore, sign-out, deletion.

## 6. Account deletion

1. The app must offer deletion inside the app (Guideline 5.1.1(v)) and delete the data, not hide the account.
2. Apple says apps that support Sign in with Apple "should" revoke user tokens through the REST API at deletion (https://developer.apple.com/support/offering-account-deletion-in-your-app/). TN3194 calls that endpoint the only way to invalidate tokens programmatically, and says you must still fulfil the deletion when you hold no token: https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple
3. Revocation needs the `.p8` key, so it runs on a server or in a backend that holds the key. If your backend cannot do it, apply the `apple-token-revocation` pattern doc before App Store submission. This is expected, not a documented hard gate. TN3194 gives a manual fallback only when you hold no token for the user (delete the data and direct the user to revoke in Settings); with server infrastructure, it expects you to store and revoke tokens. Revocation needs the paid membership above, because the `.p8` key comes from it.
