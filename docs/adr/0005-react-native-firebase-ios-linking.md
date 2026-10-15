# 0005 · React Native Firebase iOS linking

Status: Accepted (spike S2, maintainer chose B) · 2026-10-15

## Context

The `firebase` variant uses `@react-native-firebase/app` and `@react-native-firebase/auth` 26.4 with the modular API and no Crashlytics. On iOS, RNFB 26 resolves the Firebase Apple SDK with Swift Package Manager by default, and that needs dynamic frameworks. Its documented opt-out is CocoaPods (`disableSPM`) with static frameworks. With Expo's prebuilt core, every RNFB native module must then be listed in `forceStaticLinking` ([RNFB 26.4.0 install docs](https://github.com/invertase/react-native-firebase/blob/v26.4.0/docs/index.mdx), [RNFB 26.4.0 on SPM](https://github.com/invertase/react-native-firebase/blob/v26.4.0/docs/ios-spm.mdx)). The app also links Sentry, MMKV (Nitro) and Reanimated, and the variant adds Google sign-in.

## Decision

Use **B: CocoaPods plus static frameworks**:

- the `@react-native-firebase/app` config plugin with `ios: { disableSPM: true }`, plus the `@react-native-firebase/auth` plugin. Both are placed before `expo-build-properties`, which is the order S2 tested.
- an `ios` key on the existing `expo-build-properties` entry: `useFrameworks: 'static'` and `forceStaticLinking` listing every RNFB native module the variant uses (`RNFBApp`, `RNFBAuth`). Extend the existing entry rather than adding a second one.
- RNFB pinned exactly, because the decision is validated on 26.4.0 only.

Never combine RNFB's SPM mode with static frameworks. RNFB's docs say `pod install` rejects that combination; S2 did not test this.

## Evidence

Spike S2 ran on 2026-10-15. It used EAS iOS simulator Release builds with no dev client, Expo SDK 57.0.28, RN 0.86.3, RNFB 26.4.0, Sentry ~7.11, MMKV 4.3.2, Nitro 0.37.1, Reanimated 4.5.1 and a placeholder Firebase config. The builds were A `d4f940e2-45d0-4dcf-ae34-f560a4021b23` and B `6f7d6277-7339-44a3-82dd-4c1a69a10870`.

Both built at the first attempt and launched to the sign-in screen. `getApp()` returned `[DEFAULT]`, and neither had crashed after 12 s.

- **A (SPM + dynamic frameworks):** launched, with five duplicate-class warnings for GoogleUtilities classes (`GULLoggerWrapper`, a logger and an NSData helper). There was a single `FIRApp`. Whether the duplication matters with more Firebase modules is unverified. `Sentry.framework` and `MMKVCore` were dynamic frameworks in A.
- **B (CocoaPods + static + `forceStaticLinking`):** launched with no duplicate-class warnings. Sentry and MMKV were linked statically.

With precompiled modules on (the default from SDK 56), Expo links about 85 RN, Expo and wrapper pods statically in either setup, including `RNSentry`, `NitroMmkv` and `RNReanimated`. `useFrameworks` still decides how RNFB, Firebase, `Sentry.framework` and `MMKVCore` link. B avoids the SPM-under-Expo path: RNFB 26.1.0 added SPM, and 26.2.0 and 26.3.3 added Expo repair hooks for it. `disableSPM` itself only arrived in the Expo plugin in 26.2.0. No primary-source reports were found of Sentry, MMKV 4 or Reanimated 4 conflicts under `use_frameworks` on RN 0.86, in either direction. The two builds are the only evidence.

## Consequences

- **Privacy manifests.** Apple does not merge the privacy manifests of static pods. B's build ships Firebase privacy bundles that declare UserDefaults reasons `C56D.1` (GoogleUtilities) and `1C8F.1` (FirebaseCoreInternal), on top of the `CA92.1` the app already lists. PR7 must add both to `ios.privacyManifests` and re-check Firebase's bundles. `bun run privacy:check` only scans `node_modules`, so it cannot see CocoaPods manifests.
- **More RNFB modules.** Adding another RNFB module means adding it to `forceStaticLinking` too.
- **What S2 did not cover**, all still open:
  - real Firebase auth with a real project;
  - a development-client build under B, which is what the template's e2e uses;
  - Google sign-in (nitro, GoogleSignIn SDK) beside Firebase under static frameworks;
  - Sentry at runtime (no DSN was set);
  - a Reanimated animation running under static linking;
  - device, archive, TestFlight and App Store builds;
  - Android.
- **Who covers what.** PR7's own e2e runs on the Firebase Auth Emulator plus a manual real-phone check, so it covers the dev-client and Google sign-in builds. A real-project sign-in and a device Release archive are separate checks, and they belong in PR7's definition of done and the release routine before the first release.
- **Reversibility.** The decision is a build setting, so it can be changed later without touching app code.
