---
name: release
description: Cut a build, submit to the stores, publish/promote/roll back an OTA update, bump versions, or decide whether a change can ship over the air. Use for "release", "eas build", "eas submit", "eas update", "rollback", "bump version". Not for local dev builds (expo-dev-client), EAS Update concepts (eas-update), store listings (eas-app-stores), or env vars (env-secrets).
allowed-tools: "Bash(bun run eas whoami), Bash(bun run eas build:list *), Bash(bun run eas build:version:get *), Bash(bun run eas update:list *), Bash(bun run eas update:view *), Bash(bun run eas channel:list *), Bash(bun run eas channel:view *), Bash(bun run eas fingerprint:generate *), Bash(bun run eas fingerprint:compare *), Bash(bun run eas * --help)"
---

# Release

Template-specific glue on top of `eas-update` (OTA concepts) and `eas-app-stores` (store metadata). Those
vendored skills say `npx`; here it is always `bun run eas ...` (the `eas` script in package.json pins eas-cli; a hook denies `npx`).

## Human gates — never run these without an explicit go-ahead in this session

`build --profile production`, `submit`, any `eas update` to `preview` or `production`, `update:republish`,
`update:rollback`, `update:roll-back-to-embedded`, `channel:edit`, `channel:rollout`, `env:set`/`env:delete`
on `production`. They are not pre-approved in this skill — every one prompts. State the exact command and what it
affects (channel, platform, environment), then wait. `eas credentials`, the first Play Console upload and the first
iOS credential prompts are interactive: stop and hand them to the human.

You never push, tag, or merge as part of a release unless asked; use the git workflow in `AGENTS.md`.

## Profile map (`eas.json`)

| Profile | Channel | APP_ENV / bundle id | Use for |
|---|---|---|---|
| `development`, `development-device` | `development` | development / `….dev` | dev client (internal) |
| `preview` | `preview` | preview / `….preview` | internal QA build; acts as staging |
| `production` | `production` | production / `com.example.expoapptemplate` | stores; `autoIncrement` on |

Keep channel and branch names identical. There is no staging profile — `preview` is staging.
Every build profile sets `APP_ENV` and `EXPO_PUBLIC_APP_ENV` in its `env`. EAS Update does not read the profile
`env` (see OTA below).

## Preflight (all read-only; stop on the first failure)

Blocks below are bash (Git Bash or WSL on Windows). The inline `VAR=value cmd` prefix does not work in PowerShell: set
`$env:APP_ENV = "preview"; $env:EXPO_PUBLIC_APP_ENV = "preview"` first, then run the command.

```bash
git status --short && git branch --show-current     # clean tree, feature/release branch, not main
bun run verify                                      # every check in package.json `verify`
bun run doctor
bun run eas whoami
bun run eas build:version:get -p all -e production # current remote build numbers
bun run eas env:list --environment production      # EXPO_PUBLIC_API_URL must exist; prompts, never add --include-sensitive
```

Then check by reading `app.config.ts`: `EAS_PROJECT_ID` is set (otherwise there is no `updates.url` and no OTA);
`src/app/sign-in.tsx` is no longer the mock (it refuses production builds); no secret sits in `EXPO_PUBLIC_*`
(`env-secrets` skill); the `version` is what you want users to see. If Sentry is configured, remove
`SENTRY_ALLOW_FAILURE` from `eas.json` `build.base.env` first: while it is set, a failed source-map upload does not fail
the build, and production crashes arrive unsymbolicated. After `bun run doctor`, run
`git diff --stat bun.lock` — bun may rewrite the lockfile; do not commit that by accident.

## Versions

`appVersionSource` is `remote`: `ios.buildNumber` / `android.versionCode` live on EAS and `autoIncrement`
bumps them on each production build; values in `app.config.ts` are ignored. `version` in `app.config.ts` is
the user-facing version — change it by hand for a store release, never for an OTA. Inspect or repair counters with
`build:version:get`, `build:version:set`, `build:version:sync` (run `--help` first; `set` and `sync` write to EAS).

## Build

```bash
bun run eas build --profile preview --platform android      # or ios / all
bun run eas build --profile production --platform all       # human gate
```

- iOS cloud builds need no local Xcode. Local `bun run ios` needs macOS and Xcode (`xcodebuild -version`). Windows and Linux build iOS only in the cloud.
- `eas.json` pins only `node`. To pin the build image to the SDK, add `"image": "sdk-57"` to `build.base` — ask first.
- First iOS build: EAS prompts for Apple credentials interactively. Hand over.
- Smoke-test the exact preview build on a device before publishing to production. Its app id is
  `com.example.expoapptemplate.preview`, not the `.dev` id. CI e2e builds with Gradle, not an EAS profile.

## Submit (human gate)

`submit.production` in `eas.json` is empty. Fill what applies, never guess values:

- Android: `serviceAccountKeyPath` (keep the JSON out of git; `.gitignore` already covers `*service-account*.json` and `play-store-key*.json`) and `track` (start `internal`).
  The very first upload must be done by hand in Play Console.
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
`associatedDomains`, icons, splash, `expo-notifications` plugin options), or changed `APP_ENV`. Publishing anyway
reaches no one (or the wrong build).

Check before publishing — compare the working tree to the build you target:

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
prefix is no longer needed. Whether the shell value or the EAS variable wins on a conflict is unverified — keep them equal.

After publishing, check `bun run eas update:view <group-id>` and open the matching build to confirm it picks it up
(cold launch twice: the update downloads on the first launch and applies on the next).

### Roll out, roll back (human gates)

```bash
# Gradual rollout, then widen or revert (same APP_ENV prefix as the publish above)
APP_ENV=production EXPO_PUBLIC_APP_ENV=production \
  bun run eas update --channel production --environment production --rollout-percentage 10 --message "..."
bun run eas update:edit            # widen (interactive)
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
`channel:rollout` are interactive — hand over rather than loop.

## Report

State: what was built/published, profile, channel, platform, update group id or build id, the fingerprint
check result, what was deliberately not done (production steps awaiting approval), and the rollback command.
