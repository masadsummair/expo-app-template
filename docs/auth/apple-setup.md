# Sign in with Apple setup

Provider-neutral. iOS only: the app offers Apple sign-in on iOS and not on Android.

## Why

App Review Guideline 4.8 requires an equivalent privacy-focused login wherever an iOS app offers a third-party login such as Google. Sign in with Apple satisfies it. Guideline 5.1.1(v) requires in-app account deletion; see the last section.

## 1. Capability

1. Apple Developer, Certificates, Identifiers & Profiles, Identifiers.
2. Open the App ID of each build variant (development, preview, production) and enable **Sign In with Apple**.
3. In the app config, turn on Sign in with Apple for iOS and add the `expo-apple-authentication` config plugin. The entitlement is generated at prebuild; never edit the native iOS project by hand.
4. Rebuild. Changing a capability invalidates provisioning profiles, so let EAS regenerate them (`bun run eas credentials`) before the next build.

## 2. Provider configuration

- The native flow identifies the app by its **bundle ID**. Enter the bundle ID of every variant in the backend's Apple provider settings as the client ID. UNVERIFIED: some backends take a comma-separated list, others one entry.
- A backend that revokes tokens for you (see the last section) also needs the Team ID, a Key ID and the `.p8` key. That secret is entered in the backend's dashboard, never in the app.
- A Services ID and a return URL are needed only for browser-based Apple sign-in, which this app does not use.

## 3. Nonce

1. Generate a random raw nonce for every attempt.
2. Pass its SHA-256 (hex) to Apple as the request `nonce`. Apple puts that hash in the identity token.
3. Pass the **raw** nonce to the backend with the identity token. The backend hashes it and compares.

## 4. Name capture

Apple returns the user's name and email only on the **first** authorization of the app for that Apple ID. Later sign-ins return `null` for both.

1. Save the name in the same step as the first sign-in (a profile update on the backend, or the SDK's profile call).
2. To test the first-run path again, remove the app from Settings, your name, Sign-In & Security, Sign in with Apple on the test device.
3. "Hide My Email" users arrive with a relay address. Configure outbound email for relay delivery if you send email.

## 5. Testing on a device

- Test on a real iPhone signed in to an Apple ID. UNVERIFIED: the Simulator works when signed in to an Apple ID, but behaviour differs; do not rely on it for the final check.
- The Apple sheet cannot be automated. End-to-end tests use the email and password form of the test environment.
- Check on a device: first sign-in with the name captured, a cold-start restore, sign-out, deletion.

## 6. Account deletion

1. The app must offer deletion inside the app (Guideline 5.1.1(v)) and delete the data, not hide the account.
2. Apple expects the app to revoke the Sign in with Apple token at deletion (TN3194): https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple
3. Revocation needs the `.p8` key, so it runs on a server or in a backend that holds the key. If your backend cannot do it, apply the `apple-token-revocation` pattern doc **before App Store submission**.
