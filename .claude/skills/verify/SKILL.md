---
name: verify
description: Run every local check this template has (every step of the `verify` script, plus expo-doctor and optionally the e2e suite) and report real pass/fail output. User-invoked with /verify before saying work is done. Not for diagnosing a failure (use debug-rn).
disable-model-invocation: true
argument-hint: "[--e2e android|ios]"
---

# /verify

Run these in order and paste each command's real result. Stop at the first failure and report it — do not
"fix and re-run" silently.

1. `bun run verify` — every check in the `verify` script of `package.json` (it stops at the first failure; report
   that one by name). That includes the standards check: `docs:check` validates `standards/*.json` and
   `docs/standards.md`.
2. `bun run doctor` — dependency and config issues (`expo-doctor`).
3. E2E — only when `$ARGUMENTS` contains `--e2e` and a dev build is installed on a booted device:
   `bun run test:e2e:android` or `bun run test:e2e:ios`. iOS only runs on macOS: elsewhere report
   `e2e ios: not run (needs macOS)`. Android needs `adb` on PATH and a booted emulator. On failure read
   `.e2e/failures/*.md` first.

## Report

```
## Verify
| Check | Result |
|---|---|
| verify (every step of the script) | ✅ / ❌ <first error line> |
| expo-doctor | ✅ n/n / ❌ <check name> |
| e2e <platform> | ✅ n/n / ❌ <test> / not run (<reason>) |
```

A failure means the work is not done. Hand it to the `debug-rn` skill with the exact failing command.
Never report a check as passing that you did not run in this session.
