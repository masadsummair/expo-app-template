# Firebase App Check

Optional pattern. Apply it only when you choose it. App Check is not part of the template core.

Cost: App Check itself is no-cost on the Spark plan ([pricing](https://firebase.google.com/pricing)). Play Integrity setup requires linking the app in Play Console, a paid registration ([Play Integrity](https://firebase.google.com/docs/app-check/android/play-integrity-provider)). App Attest needs the App Attest capability, which needs the paid Apple Developer Program ([Apple capabilities](https://developer.apple.com/help/account/reference/supported-capabilities-ios)). Both are optional for trying the template.

## Concept

App Check proves that a request to your Firebase backend comes from your genuine, unmodified app. The client SDK obtains a short-lived attestation token and attaches it to Firebase calls. The backend products set to "enforce" reject calls without a valid token. The providers are Play Integrity on Android and App Attest (with DeviceCheck as a fallback) on iOS.

## Example

1. Add the App Check native module for your Firebase SDK. With React Native Firebase in this CNG template, also add the `@react-native-firebase/app-check` config plugin to `app.config.ts`: the RNFB v26.4.0 usage doc says it registers the native module before `FirebaseApp.configure()` and replaces the manual native edit, which this template cannot make by hand. That `initializeAppCheck` fails without it is inferred. Register each app in the Firebase console with its provider.
2. Activate it at startup with one provider per platform, and the **debug provider** for development builds and emulators.
3. Register each debug token in the console. A debug token is a credential: keep it out of the repository.
4. Watch the App Check metrics until unverified traffic is near zero, then switch enforcement on per product (Firestore, Storage, and so on). Firebase lists Authentication among the enforceable products, but the React Native Firebase usage doc does not. UNVERIFIED: Auth enforcement from React Native.

```ts
import { getApp } from '@react-native-firebase/app';
import {
  ReactNativeFirebaseAppCheckProvider,
  initializeAppCheck,
} from '@react-native-firebase/app-check';

const provider = new ReactNativeFirebaseAppCheckProvider();
provider.configure({
  android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
  apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback' },
});
await initializeAppCheck(getApp(), { provider, isTokenAutoRefreshEnabled: true });
```

From the React Native Firebase v26.4.0 usage doc ([source](https://github.com/invertase/react-native-firebase/blob/v26.4.0/docs/app-check/usage/index.mdx)), which also shows optional `debugToken` and `web` entries. The module needs the New Architecture from v26.

## Limitations

- It needs a Firebase backend and the native Firebase modules. It does nothing for other backends.
- It raises the cost of abuse; it does not stop a determined attacker on a modified device.
- Enforcing too early locks out old app versions and testers without debug tokens.
- App Attest needs a real device; simulators use the debug provider.
- Play Integrity allows 10,000 calls per day on the Standard tier ([Firebase](https://firebase.google.com/docs/app-check)); check that against your volume.
- Sources conflict on Play distribution: React Native Firebase says Play Integrity requires distribution from the Play Store to fetch tokens, Firebase says it supports apps on or off Google Play. UNVERIFIED which holds for sideloaded builds.

## Scope

- Fits: Firebase apps with abusable endpoints (SMS or phone verification costs, paid APIs).
- Does not fit: small internal apps, or backends other than Firebase.
