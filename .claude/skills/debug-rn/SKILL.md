---
name: debug-rn
description: Diagnosis loop for bugs and crashes in this Expo app. Use when the user says "debug"/"diagnose", or reports something broken, throwing, failing, crashing or blank. Do not use for performance work (perf-auditor), writing new features, or routine test runs (use verify).
---

# Debugging React Native bugs

Adapted from Matt Pocock's `diagnosing-bugs` skill (MIT, see `THIRD_PARTY/mattpocock-skills`).
Skip a phase only when you can say why.

## Phase 1 — Build a red-capable feedback loop

**This is the skill.** With a tight pass/fail signal for *this* bug you will find the cause; without one,
reading code produces theories, not fixes. Try, roughly in order:

1. **Jest test** at the seam that reaches the bug (`bun run test -- <path>`). Logic in `src/services`,
   `src/stores`, `src/lib` should almost always be reproducible here — no simulator needed.
2. **Component test** with React Native Testing Library (see the `react-native-testing` skill).
3. **Replay a captured payload.** Save the real API response to a fixture and feed it through `request()`
   with a mocked `fetch` — most "bad-data" and parsing bugs die here.
4. **Device repro over the `e2e` MCP server**: delegate the session to the `app-tester` agent (observe → act →
   observe, select by testID). Once it reproduces, encode it as an e2e test so it can be replayed. Select by `testID`,
   not label text.
5. **An e2e test** in `e2e/` when the bug spans screens (see the `e2e-flow` skill).
6. **Differential loop:** same input on iOS vs Android, dev vs release (`SENTRY_DISABLE_AUTO_UPLOAD=true bunx expo run:android --variant release`, `SENTRY_DISABLE_AUTO_UPLOAD=true bunx expo run:ios --configuration Release` (PowerShell: `$env:SENTRY_DISABLE_AUTO_UPLOAD = 'true'` first), or `E2E_BUILD=release`),
   Hermes vs expectations — many RN bugs are platform- or build-mode-specific.
7. **Human in the loop** only as a last resort: give the user exact steps and ask for the Metro log,
   the device log, or a screen recording.

Tighten the loop: faster (narrow the Jest path), sharper (assert the exact symptom), deterministic
(fake timers, fixed fixtures, no real network).

**Done when** you can paste one command you have already run that goes red on the user's exact symptom.
If you are reading code to build a theory before that command exists — stop.

### RN-specific signals to collect first

- **Metro terminal output** and the red/yellow box message, verbatim.
- **Native crash** (app closes, no red box): `bunx expo run:ios` / `run:android` output, or the device log.
  A native crash after adding a library usually means the dev build is stale — rebuild before anything else.
- **Device logs.** Android (any OS): `adb logcat "*:E" ReactNativeJS:V`. iOS (macOS only):
  `xcrun simctl spawn booted log stream --predicate 'process == "<AppName>"'`, where `<AppName>` is the
  app executable name (`CFBundleExecutable` in `xcrun simctl listapps booted`).
- **`bun run doctor`** (`expo-doctor`) for version mismatches after dependency changes.
- **Works in dev, broken in release:** check `EXPO_PUBLIC_*` inlining (must be literal `process.env.X`),
  missing config plugins, and code guarded by `__DEV__`.

## Phase 2 — Reproduce and minimise

Confirm the loop shows the failure the **user** described, not a nearby one. Then cut inputs, props,
providers and steps one at a time until every remaining element is load-bearing.

## Phase 3 — Hypothesise

List 3–5 ranked, falsifiable hypotheses: "If X is the cause, changing Y makes it disappear."
Show the list to the user before testing — they often re-rank it instantly.

Common RN causes worth ranking: stale dev build vs JS; platform difference; a render loop from state set
during render or in an effect; stale closure in a Reanimated worklet or callback; list items without
stable keys; keyboard/safe-area insets; a promise rejection swallowed outside the `ApiResult` contract.

## Phase 4 — Instrument

One variable at a time. Prefer React Native DevTools (press `j` in Metro) over logs. When you log,
tag every line `[DEBUG-xxxx]` so cleanup is one grep. For performance, measure first
(see the `react-native-best-practices` skill: React profiler, FPS, TTI), then change.

## Phase 5 — Fix with a regression test

Write the failing test at a seam that exercises the real bug pattern, watch it fail, fix, watch it pass,
then re-run the Phase 1 loop against the original scenario. If no correct seam exists, say so — that is a finding.

## Phase 6 — Clean up

- [ ] Original repro no longer reproduces
- [ ] Regression test passes (or the missing seam is documented)
- [ ] `grep -rn "\[DEBUG-" src` returns nothing
- [ ] `bun run verify` passes
- [ ] The confirmed hypothesis goes in the commit message
