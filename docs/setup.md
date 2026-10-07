# Setup

## What you need

| | macOS | Linux | Windows |
|---|---|---|---|
| Always | bun ≥ 1.3.7, Node ≥ 22.12, Git | same | same, plus Git for Windows (Claude Code uses its bash) |
| Android | Android Studio + SDK and its JDK | same | same; keep the repo path short (long paths break native builds) |
| iOS | Xcode ≥ 26.4 (older toolchains fail, see `AGENTS.md` Gotchas) | EAS cloud build only | EAS cloud build only |
| `ANDROID_HOME` | `~/Library/Android/sdk` | `~/Android/Sdk` | `%LOCALAPPDATA%\Android\Sdk` |
| `JAVA_HOME` | `/Applications/Android Studio.app/Contents/jbr/Contents/Home` | Android Studio's `jbr` folder | `C:\Program Files\Android\Android Studio\jbr` |
| e2e tests | iOS and Android | Android | inside WSL2 (upstream: "On Windows, run inside WSL") |

`.node-version` pins Node 24. Shell snippets in the skills are bash; in PowerShell write `$env:NAME = 'x'` instead of
`NAME=x cmd`.

**Accounts**

- [Expo](https://expo.dev) for EAS. The free tier covers Android development builds.
- Apple Developer Program (paid) for iOS device builds and the App Store. The iOS simulator on a Mac doesn't need it.
- Optional: Google Play, Sentry, and a model for the AI steps in e2e tests ([testing.md](testing.md#ai-steps)).

## Start a new app

1. **Copy the template** (fresh git history, then your own remote):
   ```bash
   git clone --depth 1 https://github.com/masadsummair/expo-app-template my-app
   cd my-app
   rm -rf .git          # PowerShell: Remove-Item -Recurse -Force .git
   git init
   bun install          # after git init, so it can turn on the pre-commit hook
   ```
   Create the app's own GitHub repo and push when you're ready.
2. **Rename it.** Without `--write` it only previews the changes; with `--write` it applies them:
   ```bash
   bun run rename --id com.acme.app --name "Acme" --slug acme-app --write
   ```
   This sets the bundle id, display name, slug and URL scheme in `app.config.ts` and `e2e/support/build-mode.ts`, the
   package name, the README title, and the example ids in specs, skills and agents. Then run `bun install` and
   `bun run skills:sync`. If `ios/` or `android/` already exist, run `bunx expo prebuild --clean` afterwards.
3. **Connect EAS:** `bun run eas login`, then `bun run eas init`. Paste the printed project id into `EAS_PROJECT_ID` in
   `app.config.ts` (`eas init` can't edit a dynamic config). That also turns on EAS Update.
4. **Set env vars:** `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`) and set `EXPO_PUBLIC_API_URL`
   for local development. For preview and production, add `EXPO_PUBLIC_API_URL` (https) as an EAS environment
   variable: `.env` is never uploaded, and those builds fail fast without it.
5. **First run.** It's a development build, not Expo Go, and the first build takes several minutes.
   - macOS: `bun run ios` or `bun run android`.
   - Linux / Windows: start an Android emulator or plug in a device with USB debugging, then `bun run android`.
   - iOS without a Mac: needs a paid Apple Developer Program membership and a registered iPhone. Run
     `bun run eas device:create`, then `bun run eas build --profile development-device --platform ios`, and install it.
     Later sessions only need `bun run start` to serve JS.
6. **Replace the mock sign-in** in `src/app/sign-in.tsx` with your auth provider. The mock accepts any credentials and
   refuses production builds. The e2e fixtures (`e2e/support/open-app.ts`) and the agent `context` in `e2e.config.ts`
   depend on the testIDs `sign-in-screen`, `home-screen` and `home-sign-out`: update them with the new auth and Home.
7. **Crash reporting (optional):** set `EXPO_PUBLIC_SENTRY_DSN`, plus `SENTRY_ORG`, `SENTRY_PROJECT` and
   `SENTRY_AUTH_TOKEN` as EAS environment variables for source-map upload. Until then builds still pass, because
   `eas.json` sets `SENTRY_ALLOW_FAILURE=true`. Remove it once Sentry works, so a failed upload fails the release build.
8. **First prompt:** open the project in your agent and start with `/new-feature add a profile edit screen` (Claude
   Code). In other tools: "Read AGENTS.md, then read `.claude/skills/new-feature/SKILL.md` and follow it for: add a
   profile edit screen." The spec it writes follows `specs/_template.md`.
