---
name: release
description: Cut a build, submit to the stores, publish/promote/roll back an OTA update, bump versions, or decide whether a change can ship over the air. Use for "release", "eas build", "eas submit", "eas update", "rollback", "bump version". Not for local dev builds (expo-dev-client), EAS Update concepts (eas-update), store listings (eas-app-stores), or env vars (env-secrets).
allowed-tools: "Bash(bun run eas whoami), Bash(bun run eas build:list *), Bash(bun run eas build:version:get *), Bash(bun run eas update:list *), Bash(bun run eas update:view *), Bash(bun run eas channel:list *), Bash(bun run eas channel:view *), Bash(bun run eas * --help)"
---

# Release

Template-specific glue on top of `eas-update` (OTA concepts) and `eas-app-stores` (store metadata). Those
vendored skills say `npx`; here it is always `bun run eas ...` (the `eas` script in package.json pins eas-cli; a hook denies `npx`).

## Human gates — never run these without an explicit go-ahead in this session

`build --profile production`, `submit`, any `eas update` to `preview` or `production`, `update:republish`,
`update:rollback`, `update:roll-back-to-embedded`, `channel:edit`, `channel:rollout`, `env:set`/`env:delete`
on `production`. They are not pre-approved in this skill. In Claude Code the guard hook (`.claude/hooks/guard-bash.ts`)
asks for each; Codex has no such hook, so ask first. State the exact command and what it affects (channel, platform,
environment), then wait. `eas credentials` and the iOS credential prompts are interactive: stop and hand them to the human.

You never push, tag, or merge as part of a release unless asked; use the git workflow in `AGENTS.md`.

## Profile map (`eas.json`)

| Profile | Channel | APP_ENV / bundle id | Use for |
|---|---|---|---|
| `development`, `development-device` | `development` (no effect: `channel` is ignored when `developmentClient` is true) | development / `….dev` | dev client (internal) |
| `preview` | `preview` | preview / `….preview` | internal QA build; acts as staging |
| `production` | `production` | production / `com.example.expoapptemplate` | stores; `autoIncrement` on |

`development-device` (iOS device) needs a paid Apple Developer Program membership and a registered device: `bun run eas device:create` first.

Keep channel and branch names identical. There is no staging profile — `preview` is staging.
Every build profile sets `APP_ENV` and `EXPO_PUBLIC_APP_ENV` in its `env`. EAS Update does not read the profile
`env` (see OTA below).

## Preflight (all read-only; stop on the first failure)

Blocks below are bash (Git Bash or WSL on Windows). The inline `VAR=value cmd` prefix does not work in PowerShell: set
`$env:APP_ENV = "preview"; $env:EXPO_PUBLIC_APP_ENV = "preview"` first, then run the command.

```bash
echo "${EAS_PROJECT_ID:?export EAS_PROJECT_ID first}"  # project-scoped EAS commands below fail without it
git status --short && git branch --show-current     # clean tree, feature/release branch, not main
bun run verify                                      # every check in package.json `verify`
bun run doctor
bun run eas whoami
bun run eas build:version:get -p all -e production # current remote build numbers
bun run eas env:list --environment production      # EXPO_PUBLIC_API_URL must exist; prompts, never add --include-sensitive
```

The first line checks that `EAS_PROJECT_ID` is exported in your shell (`app.config.ts` reads it; the id is never
committed). Without it every project-scoped EAS command fails with "EAS project not configured" (interactively it first offers to create a new EAS project: answer no) and there is no
`updates.url`. Then check by reading the code: `src/app/sign-in.tsx` is no longer the mock (it refuses production builds); no secret sits in `EXPO_PUBLIC_*`
(`env-secrets` skill); the `version` is what you want users to see. If Sentry is configured, remove
`SENTRY_ALLOW_FAILURE` from `eas.json` `build.base.env` first: while it is set, a failed source-map upload does not fail
the build, and production crashes arrive unsymbolicated. After `bun run doctor`, run
`git diff --stat bun.lock` — bun may rewrite the lockfile; do not commit that by accident.

## Versions

`appVersionSource` is `remote`: `ios.buildNumber` / `android.versionCode` live on EAS and `autoIncrement`
bumps them on each production build; values in `app.config.ts` are ignored. `version` in `app.config.ts` is
the user-facing version — change it by hand for a store release, never for an OTA. Inspect or repair counters with
`build:version:get` and `build:version:set` (run `--help` first; `set` writes to EAS). `build:version:sync` copies remote versions into native code, which has no effect here: `ios/` and `android/` are gitignored, so eas-cli treats the project as managed and skips it (eas-cli 24.11.0 `build/version/sync.ts`).

## Build

```bash
bun run eas build --profile preview --platform android      # or ios / all
bun run eas build --profile production --platform all       # human gate
```

- iOS cloud builds need no local Xcode. Local `bun run ios` needs macOS and Xcode (`xcodebuild -version`). Windows and Linux build iOS only in the cloud.
- `eas.json` pins only `node`. To pin the build image to the SDK, add `"image": "sdk-57"` to `build.base` — ask first.
- iOS device and store builds prompt for Apple credentials interactively: hand over. Simulator builds (`development` profile, `ios.simulator: true`) need no Apple account.
- Smoke-test the exact preview build on a device before publishing to production. Its app id is
  `com.example.expoapptemplate.preview`, not the `.dev` id. Local release e2e builds with Gradle, not an EAS profile.

## Submit (human gate)

`submit.production` in `eas.json` is empty. Store submission needs a Google Play developer account (US$25 one-time
registration, [Google](https://support.google.com/googleplay/android-developer/answer/6112435)) and, for the App Store,
the paid Apple Developer Program, which lists App Store distribution among its membership benefits
([Apple](https://developer.apple.com/programs/whats-included/)). Neither is needed to develop or try the template. Fill
what applies, never guess values:

- Android: `serviceAccountKeyPath` (keep the JSON out of git; `.gitignore` covers `*service-account*.json`, `serviceAccount*.json` and `play-store-key*.json`; a key downloaded from Google Cloud has a project-id name that none of these match, so rename it to `play-store-key.json`) and `track` (start `internal`).
  The app record must exist in Play Console, and EAS needs the service-account key (uploaded to EAS, or via `serviceAccountKeyPath`); then the first `eas submit` creates the first internal-track release. A manual first upload is optional.
- iOS: `ascAppId` (App Store Connect app id), Apple credentials via `bun run eas credentials` (interactive).

```bash
bun run eas submit --platform android --latest   # or --id <build-id>
bun run eas build --profile production --auto-submit   # build + submit in one step
```

Key names and flags: `bun run eas submit --help`, plus the `eas-app-stores` skill.

## OTA update — decide first

OTA is allowed only when the change is JS/assets and the fingerprint is unchanged. `runtimeVersion` uses the
`fingerprint` policy, so an update is delivered only to builds with the identical native fingerprint.

**OTA is NOT allowed (cut a new build) when you** added/removed/upgraded a native dependency or Expo SDK, added or
changed a config plugin, changed `app.config.ts` native fields (bundle id, `scheme`, permissions, `intentFilters`,
`associatedDomains`, icons, splash, `expo-notifications` plugin options), changed `APP_ENV`, or changed the EAS project
id. The default fingerprint also hashes the whole `eas.json`, `.easignore` and `.gitignore` (`@expo/fingerprint` 0.20.14 `sourcer/Expo.js`) (observed: changing `submit`, `cli.version`,
`channel`, `image` or `environment` changed the hash), so filling `submit.production` or adding `image`/`environment`
also needs a new build. Publishing anyway reaches no one (or the wrong build).

Check before publishing — compare the working tree to the build you target. `fingerprint:generate` and `fingerprint:compare`
upload a fingerprint and create a record on the EAS project (a server write), so they are not pre-approved and prompt under Claude Code's default permissions (no hook asks for them):

```bash
APP_ENV=preview EXPO_PUBLIC_APP_ENV=preview \
  bun run eas fingerprint:generate --environment preview --platform android --json --non-interactive
bun run eas build:list --build-profile preview --platform android --status finished --limit 3  # note the build id
APP_ENV=preview EXPO_PUBLIC_APP_ENV=preview \
  bun run eas fingerprint:compare --build-id <build-id> --environment preview
```

The `APP_ENV` prefix matters: the local fingerprint is computed from `app.config.ts`, which defaults to `development`
(different bundle ids) and would never match a preview build. Differences listed = a new build is required.

### Publish (human gate)

**`eas update` does not read the build profile `env`.** Without `APP_ENV` it resolves `app.config.ts` as
`development`: wrong bundle ids, wrong fingerprint, update matches no build, and the `EXPO_PUBLIC_API_URL` guard is
skipped. Always pass both variables and the matching EAS environment:

```bash
APP_ENV=preview EXPO_PUBLIC_APP_ENV=preview \
  bun run eas update --channel preview --environment preview --platform all --message "fix: <what changed>"
```

Use `production` / `production` for the production channel. `--environment` loads that environment's server-side
variables (`EXPO_PUBLIC_API_URL`); local `.env*` files are ignored. Better long-term fix, ask the human: define
`APP_ENV` and `EXPO_PUBLIC_APP_ENV` as plaintext EAS variables in each environment (`env-secrets` skill), so the
prefix is no longer needed. On a conflict the EAS variable wins over a same-name shell variable for `eas update` (from eas-cli 24.11.0 source; not in the docs). For `eas build` the order is `eas.json` profile `env`, then EAS variables, then shell, and the CLI warns on overlap. Keep them equal.

After publishing, check `bun run eas update:view <group-id>` and open the matching build to confirm it picks it up
(cold launch twice: the update downloads on the first launch and applies on the next).

### Roll out, roll back (human gates)

```bash
# Gradual rollout, then widen or revert (same APP_ENV prefix as the publish above)
APP_ENV=production EXPO_PUBLIC_APP_ENV=production \
  bun run eas update --channel production --environment production --rollout-percentage 10 --message "..."
bun run eas update:edit <group-id> --rollout-percentage 50 --non-interactive   # widen
bun run eas update:revert-update-rollout
# Roll back (<group-id> must be the latest update on its branch + runtime version):
# republishes the previous group, or the embedded bundle if there is none
bun run eas update:rollback <group-id> --non-interactive --message "rollback: <why>"
bun run eas update:roll-back-to-embedded --channel production --runtime-version <rv> --platform all \
  --non-interactive --message "rollback: <why>"
```

Do not promote with `update:republish --channel preview --destination-channel production`: the preview bundle was
built with `APP_ENV=preview` and the preview EAS environment, so its fingerprint, bundle ids and inlined
`EXPO_PUBLIC_*` values do not match production builds. Build the production update fresh after testing on the preview build:

```bash
APP_ENV=production EXPO_PUBLIC_APP_ENV=production \
  bun run eas update --channel production --environment production --platform all --message "..."
```

Use `update:republish` and the rollback commands only within one environment; add `--non-interactive` for a deterministic run.
Flags verified against eas-cli 24.11.0 `--help`; re-run `--help` if the CLI has moved. `update:edit` and
`channel:rollout` take flags (`channel:rollout <channel> --action --percent --non-interactive`) and are interactive only when
args are omitted. Rollouts stay a human decision: hand over rather than loop.

## Known build failures

- **EAS build fails in "Configure expo-updates" with "Runtime version mismatch"** and a `node_modules/<pkg>` fingerprint diff: a local Android build rewrote a library's `AndroidManifest.xml`. Keep `.fingerprintignore`. Debug other diffs with the `fingerprint:compare` output (the raw `fingerprint` CLI hashes local gitignored `ios/` and `android/`, which eas-cli ignores for managed projects, so its hash will not match EAS).
- **A local iOS build fails in `expo-modules-jsi` with "cannot be annotated with either SWIFT_RETURNS_RETAINED…":** that is the toolchain, not the code. This was seen with an older Xcode (observed, no documented minimum); the EAS `sdk-57` image uses Xcode 26.6, so upgrade Xcode or build on EAS. Building SDK 57 with Xcode 27 / the iOS 27 SDK needs `ios: { enableSceneSupport: true }` in the existing `expo-build-properties` plugin entry in `app.config.ts` (expo ≥ 57.0.23), or the app does not launch correctly on iOS 27. Do not patch `node_modules`.
- **A release build without `EXPO_PUBLIC_APP_ENV` counts as production**, so the mock sign-in refuses it and `env.ts` requires https. Local release builds for e2e or perf runs set `EXPO_PUBLIC_APP_ENV=development`.
- **EAS Update is off until `EAS_PROJECT_ID` is set** (shell for `bun run eas ...`, `.env` for Expo CLI; EAS build workers set `EAS_BUILD_PROJECT_ID`, and whether the worker's config evaluation sees it is UNVERIFIED until a first EAS build). Local and worker must resolve the same id: it is a fingerprint input. Expo requires the URL `scheme` to be lowercase.

## Report

State: what was built/published, profile, channel, platform, update group id or build id, the fingerprint
check result, what was deliberately not done (production steps awaiting approval), and the rollback command.
