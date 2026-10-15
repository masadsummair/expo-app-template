# Setup

## What you need

|                | macOS                                                                                   | Linux                         | Windows                                                         |
| -------------- | --------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------- |
| Always         | bun ≥ 1.3.7, Node ≥ 22.12, Git                                                          | same                          | same, plus Git for Windows (Claude Code uses its bash)          |
| Android        | Android Studio + SDK and its JDK                                                        | same                          | same; keep the repo path short (long paths break native builds) |
| iOS            | Xcode (EAS `sdk-57` image uses 26.6; see "Known build failures" in the `release` skill) | EAS cloud build only          | EAS cloud build only                                            |
| `ANDROID_HOME` | `~/Library/Android/sdk`                                                                 | `~/Android/Sdk`               | `%LOCALAPPDATA%\Android\Sdk`                                    |
| `JAVA_HOME`    | `/Applications/Android Studio.app/Contents/jbr/Contents/Home`                           | Android Studio's `jbr` folder | `C:\Program Files\Android\Android Studio\jbr`                   |
| e2e tests      | iOS and Android                                                                         | Android                       | inside WSL2 (upstream: "On Windows, run inside WSL")            |

`.node-version` pins Node 24. Shell snippets in the skills are bash; in PowerShell write `$env:NAME = 'x'` instead of
`NAME=x cmd`.

## Host OS support

| Host OS | Run the app            | iOS build            | Android build | e2e + `e2e` MCP                        |
| ------- | ---------------------- | -------------------- | ------------- | -------------------------------------- |
| macOS   | iOS simulator, Android | local (Xcode) or EAS | local or EAS  | iOS and Android                        |
| Linux   | Android                | EAS cloud only       | local or EAS  | Android                                |
| Windows | Android                | EAS cloud only       | local or EAS  | WSL2 only (upstream: "run inside WSL") |

- `bun run ios`, `xcrun`, `xed` and `pod` need macOS; elsewhere build iOS on EAS
  (`bun run eas build --profile development-device --platform ios`; always pass `--profile`, the default is production).
  Android needs a JDK (Android Studio's works) and `ANDROID_HOME`; keep the repo path short on Windows.
- Node ≥ 22.12 and bun ≥ 1.3.7 (`engines`); `.node-version` pins Node 24. Claude hooks run on bun: no `jq`, no bash.
- Verified on macOS (iOS simulator, Android emulator). Windows and Linux ran the checks in GitHub Actions CI until it was
  removed on 2026-10-07; not re-checked since. There is no
  CI/CD (add your own if you want it): `.githooks/pre-commit` runs `bun run verify` before every commit (`bun install`
  enables it). Run `bun run doctor` and the e2e suite yourself before a release.

**Accounts**

- [Expo](https://expo.dev) for EAS. The Free plan includes a monthly allowance of Android and iOS builds and of update users; see [expo.dev/pricing](https://expo.dev/pricing) for the current limits.
- The base template (with the mock sign-in) needs no paid account on a simulator or emulator. The Apple Developer Program (paid) is needed to install on a physical iPhone via EAS or to publish, and for capabilities such as Sign in with Apple, App Attest, push notifications and associated domains (universal links); see Apple's [capabilities table](https://developer.apple.com/help/account/reference/supported-capabilities-ios). Google Play Console (paid registration) is needed only to publish (and for App Check Play Integrity).
- Optional: Sentry, and a model for the AI steps in e2e tests ([testing.md](testing.md#ai-steps)).

## Start a new app

1. **Copy the template** (fresh git history, then your own remote):

   | Variant             | Start with                                                                                 |
   | ------------------- | ------------------------------------------------------------------------------------------ |
   | Base (mock sign-in) | `git clone --depth 1 https://github.com/masadsummair/expo-app-template my-app`             |
   | Supabase auth       | `git clone -b supabase --depth 1 https://github.com/masadsummair/expo-app-template my-app` |
   | Firebase auth       | `git clone -b firebase --depth 1 https://github.com/masadsummair/expo-app-template my-app` |

   ```bash
   git clone --depth 1 https://github.com/masadsummair/expo-app-template my-app
   cd my-app
   rm -rf .git          # PowerShell: Remove-Item -Recurse -Force .git
   git init
   bun install          # after git init, so it can turn on the pre-commit hook
   ```

   Pick a variant with `-b supabase` or `-b firebase`; the rest of the steps are the same. The variant's own setup guide is in its `docs/auth/` folder.

   Create the app's own GitHub repo and push when you're ready.

2. **Rename it.** Without `--write` it only previews the changes; with `--write` it applies them:
   ```bash
   bun run rename --id com.acme.app --name "Acme" --slug acme-app --write
   ```
   This sets the bundle id, display name, slug and URL scheme in `app.config.ts` and `e2e/support/build-mode.ts`, the
   package name, the README title, and the example ids in specs, skills and agents. Then run `bun install` and
   `bun run skills:sync`. If `ios/` or `android/` already exist, run `bunx expo prebuild --clean` afterwards.
3. **Set env vars:** `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`) and set `EXPO_PUBLIC_API_URL`
   for local development. For preview and production, add `EXPO_PUBLIC_API_URL` (https) as an EAS environment
   variable: `.env` is not uploaded while the ignore file EAS uses lists `.env*` (`.easignore` if it exists, which then replaces `.gitignore`; otherwise `.gitignore`; [Expo](https://docs.expo.dev/build-reference/easignore/)), and those builds fail fast without it.
4. **Connect EAS (optional until the first cloud build or OTA update; `bun run ios` and `bun run android` don't need it):**
   `bun run eas login`, then `bun run eas init`. It links or creates the project and prints the id, then errors because it
   can't edit a dynamic config. Put the id in your `.env` from step 3 as `EAS_PROJECT_ID` (Expo CLI reads it), and also set it
   in your shell, because EAS CLI doesn't read `.env`: `export EAS_PROJECT_ID=<id>` (PowerShell:
   `$env:EAS_PROJECT_ID = '<id>'`). Set it in every new terminal, or add it to your shell profile. Every
   project-scoped EAS command (build, update, env, fingerprint) needs it, and it turns on EAS Update. If it is missing, an
   interactive EAS command offers to create a new EAS project: answer no, or you get a stray project on your account (from
   eas-cli 24.11.0 source). The template commits no id.
5. **First run.** It's a development build, not Expo Go, and the first build takes several minutes.
   - macOS: `bun run ios` or `bun run android`.
   - Linux / Windows: start an Android emulator or plug in a device with USB debugging, then `bun run android`.
   - iOS without a Mac: needs a paid Apple Developer Program membership and a registered iPhone. Run
     `bun run eas device:create`, then `bun run eas build --profile development-device --platform ios`, and install it.
     Later sessions only need `bun run start` to serve JS.
6. **Replace the mock auth** with your provider: implement `AuthProvider` (`src/services/auth/types.ts`) and point
   `authProvider` in `src/services/auth/index.ts` at it. The mock (`src/services/auth/mock.ts`) accepts any credentials
   and refuses production builds; `src/app/sign-in.tsx` is its dev and e2e form. Change that form too: it calls the
   mock directly, so swapping `index.ts` alone leaves it signing in to the mock. Google and Apple setup:
   `docs/auth/google-setup.md`, `docs/auth/apple-setup.md`. The e2e fixtures (`e2e/support/open-app.ts`) and the agent
   `context` in `e2e.config.ts` depend on the testIDs `sign-in-screen`, `home-screen` and `home-sign-out`: update them
   with the new auth and Home. `sign-in-google` and `sign-in-apple` are reserved for the provider buttons.
7. **Crash reporting (optional):** set `EXPO_PUBLIC_SENTRY_DSN`, plus `SENTRY_ORG`, `SENTRY_PROJECT` and
   `SENTRY_AUTH_TOKEN` as EAS environment variables for source-map upload. Until then builds still pass, because
   `eas.json` sets `SENTRY_ALLOW_FAILURE=true`. Remove it once Sentry works, so a failed upload fails the release build.
8. **First prompt:** open the project in your agent and start with `/new-feature add a profile edit screen` (Claude
   Code). In other tools: "Read AGENTS.md, then read `.claude/skills/new-feature/SKILL.md` and follow it for: add a
   profile edit screen." The spec it writes follows `specs/_template.md`.

## Removing the example screens

Typed routes are generated into `.expo/types` only while `expo start` runs, and Expo SDK 57 has no command that
generates them alone. A fresh clone and `typecheck` therefore do not validate `router.push`, `href` or `Stack.Screen`
names, so after deleting or renaming a route grep for its path. To delete the example screens:

1. Remove `settings.tsx` and `about.tsx`, and their entries under `src/app/(app)/`.
2. Remove their `Stack.Screen` lines in `_layout.tsx` and every `router.push` or `Link` that points at them.
3. Remove their Jest and e2e tests, and the README mentions.
4. Run `bun run start` once so the types regenerate, then `bun run typecheck`.
