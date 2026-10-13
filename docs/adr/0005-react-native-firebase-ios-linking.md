# 0005 · React Native Firebase iOS linking

Status: Proposed, gated by spike S2 · 2026-10-13

## Context

The `firebase` variant uses `@react-native-firebase/app` and `@react-native-firebase/auth` 26.4 with the modular API and no Crashlytics. On iOS, RNFB needs either dynamic frameworks (Swift Package Manager) or static frameworks plus `forceStaticLinking`. Dynamic frameworks can break other pods, and this app also links Sentry, MMKV and Reanimated.

## Decision

Not made yet. Spike S2 builds an iOS Release build with RNFB beside Sentry, MMKV and Reanimated, once with dynamic frameworks and once with static frameworks plus `forceStaticLinking`, and records which one builds and launches.

The variant uses whichever S2 shows working. If both work, the choice goes to the maintainer.

## Evidence

None yet. S2 has not run, and it needs a Firebase test project. When it has, record the build results here and change the status to Accepted.

## Consequences

- PR7 (the `firebase` branch) does not start native work until this is accepted.
- The decision is a build setting in `app.config.ts`, so it can be changed later without touching app code.
