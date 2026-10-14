# Firebase App Check

Optional pattern. Apply it only when you choose it. App Check is not part of the template core.

## Concept

App Check proves that a request to your Firebase backend comes from your genuine, unmodified app. The client SDK obtains a short-lived attestation token and attaches it to Firebase calls. The backend products set to "enforce" reject calls without a valid token. The providers are Play Integrity on Android and App Attest (with DeviceCheck as a fallback) on iOS.

## Example

1. Add the App Check native module for your Firebase SDK and register each app in the Firebase console with its provider.
2. Activate it at startup with one provider per platform, and the **debug provider** for development builds and emulators.
3. Register each debug token in the console. A debug token is a credential: keep it out of the repository.
4. Watch the App Check metrics until unverified traffic is near zero, then switch enforcement on per product (Auth, Firestore, and so on).

```ts
const provider = firebase.appCheck().newReactNativeFirebaseAppCheckProvider();
provider.configure({
  android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
  apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback' },
});
await firebase.appCheck().initializeAppCheck({ provider });
```

UNVERIFIED: this configuration call is from memory of the React Native Firebase docs. Check the version-matched page before using it.

## Limitations

- It needs a Firebase backend and the native Firebase modules. It does nothing for other backends.
- It raises the cost of abuse; it does not stop a determined attacker on a modified device.
- Enforcing too early locks out old app versions and testers without debug tokens.
- App Attest needs a real device; simulators use the debug provider. UNVERIFIED: Play Integrity quota limits for your volume.

## Scope

- Fits: Firebase apps with abusable endpoints (SMS or phone verification costs, paid APIs).
- Does not fit: small internal apps, or backends other than Firebase.
