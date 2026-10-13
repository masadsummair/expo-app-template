# 0004 · Google sign-in library

Status: Proposed, gated by spike S1 · 2026-10-13

## Context

Both variants offer Google sign-in on iOS and Android and need a fresh ID token that carries our nonce (`auth.nonce`). Three libraries were compared:

- `react-native-nitro-google-signin` 2.3.0: Credential Manager on Android, the GoogleSignIn 10 SDK on iOS, supports a nonce. One maintainer; the package is about 4.5 months old.
- Universal Sign-In: its licence forbids use in templates.
- The free Original library: uses a deprecated Android API and has no nonce.

## Decision

Candidate: `react-native-nitro-google-signin` 2.3.0 and `react-native-nitro-modules`, both pinned to exact versions (`intake.pin-risky-native`), behind one wrapper module so the library can be swapped.

This is not accepted yet. Spike S1 must show on a device, for both platforms:

- a fresh ID token that carries our nonce;
- which error shapes reach JS (the static audit found native error codes do not, and that a misconfiguration on Android reports as `cancelled`);
- that an R8 release build works;
- that a local Supabase with the nonce check on accepts the token.

The static audit also found that iOS `signIn()` and Android `getTokens()` / `getCurrentUser()` return cached ID tokens without the new nonce, that the library does not hash the nonce, that `configure()` can change at runtime, and that Android keeps the email and profile after sign-out. The wrapper therefore calls `configure()` right before each attempt, serialises attempts, uses `createAccount()` / `presentExplicitSignIn()` only, and never reads a cached token for a backend.

## Evidence

None yet. S1 has not run. When it has, record the results here and change the status to Accepted, or to Superseded with the library that replaces it.

## Consequences

- If S1 passes, the variants share one wrapper and the `google-signin-library` pattern doc explains how to switch.
- Revisit after 90 days without a release, if Universal's licence changes, or if the Original library merges nonce support and Credential Manager.
