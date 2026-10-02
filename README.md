# Expo App Template (Claude Code ready)

A production starting point for English-only mobile MVPs, built so Claude Code can develop, test,
and review the app with project-specific rules, skills, agents, and hooks.

**Stack:** Expo SDK 57 · React Native 0.86 · React 19.2 + React Compiler · TypeScript strict · Expo Router ·
Uniwind (Tailwind 4) · Zustand · TanStack Query · React Hook Form + zod · MMKV · expo-secure-store · Sentry ·
Jest + RNTL · Maestro · EAS · bun.

## Prerequisites

bun ≥ 1.3, Node 24, `jq` (the Claude Code hooks refuse to run without it), Xcode and/or Android Studio
for development builds, and optionally the Maestro CLI (`brew install maestro`) for E2E flows.

## Start a new app from this template

1. **Create the repo:** "Use this template" on GitHub, or `gh repo create my-app --template <owner>/expo-app-template --private --clone`.
2. **Rename the app:** in `app.config.ts` set `BASE_ID` (reverse-DNS bundle id), `BASE_NAME`, `slug` and `scheme`
   (lowercase). Update `MAESTRO_APP_ID` in `.eas/workflows/*.yml` to `<BASE_ID>.preview`.
3. **Install and configure:**
   ```bash
   bun install
   cp .env.example .env          # set EXPO_PUBLIC_API_URL for local development
   bunx eas-cli init             # creates the EAS project and prints its id
   ```
   Paste the project id into `EAS_PROJECT_ID` in `app.config.ts` (a dynamic config can't be edited by
   `eas init`); that also enables EAS Update. Then add `EXPO_PUBLIC_API_URL` (https) as an EAS environment
   variable for the preview and production environments — `.env` is never uploaded, and the build fails
   fast without it.
4. **Run a development build** (not Expo Go — the app has native modules):
   ```bash
   bun run ios        # or: bun run android
   bun run start      # later sessions: Metro only
   ```
5. **Replace the mock sign-in** in `src/app/sign-in.tsx` with your auth provider. The mock accepts any
   credentials, so it refuses to sign in on production builds.
6. **Crash reporting (optional):** set `EXPO_PUBLIC_SENTRY_DSN`, and `SENTRY_ORG` / `SENTRY_PROJECT` /
   `SENTRY_AUTH_TOKEN` as EAS environment variables for source-map upload.

## Everyday commands

| Command | What it does |
|---|---|
| `bun run verify` | typecheck + lint + unit tests — run before every commit |
| `bun run doctor` | `expo-doctor` dependency and config checks |
| `bunx expo install <pkg>` | add a dependency at the SDK-compatible version (dev: `bunx expo install <pkg> -- --dev`) |
| `bun run test:e2e` | Maestro flows against the running dev build, with the mock-auth test account |
| `bash .claude/hooks/test-hooks.sh` | regression tests for the Claude Code hooks |

## Claude Code setup

Open the project in Claude Code and approve the project MCP servers when prompted (or run `/mcp`):

| Server | Purpose | Notes |
|---|---|---|
| `agent-device` | Drives the iOS Simulator / Android Emulator like Claude in Chrome drives a browser | Pinned dev dependency, runs locally, no telemetry. Run `bunx agent-device doctor` once. |
| `expo` | Expo docs search, EAS builds, TestFlight data | Remote (`mcp.expo.dev`), needs an Expo login. Optional. |

What's included in `.claude/`:

- **`CLAUDE.md`** — stack, conventions, verification rules, gotchas (imports Expo's `AGENTS.md`).
- **Agents:** `rn-reviewer` (logic, slop, RN and style review), `mobile-security-auditor`, `app-tester`
  (simulator QA + Maestro flow authoring).
- **Skills:** `new-screen`, `new-component`, `api-endpoint`, `e2e-flow`, `debug-rn`, plus 11 pinned upstream skills
  from Expo and Callstack (`.claude/skills/SOURCES.md`).
- **Hooks:** deny npm/yarn/pnpm installs, `bun add` and `npx` (use `bunx expo install` / `bunx`), commits on `main`,
  force-pushes to `main`, recursive deletes of home/project, reading `.env*` files, credential stores and env dumps,
  hand-edits of generated `ios/`/`android/`, and secret-looking `EXPO_PUBLIC_*` names. They ask before the agent edits
  its own hooks, settings or MCP config, and lint each edited file. They are **guardrails against mistakes and prompt
  injection, not a sandbox** — `bash .claude/hooks/test-hooks.sh` shows exactly what they cover.

The official `expo@claude-plugins-official` plugin is disabled on purpose — the curated vendored skills replace it
at about a third of the context cost and without its telemetry. Re-enable it in `.claude/settings.json` if you prefer
automatic updates.

## CI

- **GitHub Actions** (`.github/workflows/ci.yml`): verify, expo-doctor, hook tests on every PR.
- **EAS Workflows** (`.eas/workflows/`): Maestro smoke flows on iOS and Android when a PR gets the `e2e` label.
  Needs an EAS plan with Maestro jobs and `MAESTRO_TEST_EMAIL` / `MAESTRO_TEST_PASSWORD` as EAS environment variables.

## Keeping the template current

- Expo SDK upgrades: use the `expo-upgrade` skill, then `bun run doctor`.
- Vendored skills: refresh quarterly — steps in `.claude/skills/SOURCES.md`.
- Apps created from this template don't receive later template changes automatically; port them by hand.

Credits: `THIRD_PARTY_NOTICES.md`.
