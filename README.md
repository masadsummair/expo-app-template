# Expo App Template (agent-ready)

A production starting point for English-only mobile MVPs, built so AI coding agents (Claude Code first, plus Codex,
Cursor, Copilot and Gemini CLI) can plan, build, test on a device, review and ship features with project-specific rules,
skills, agents and hooks. Phone-first, portrait.

**Stack:** Expo SDK 57 · React Native 0.86 · React 19.2 + React Compiler · TypeScript strict · Expo Router ·
Uniwind (Tailwind 4) · Zustand · TanStack Query · React Hook Form + zod · MMKV · expo-secure-store · Sentry ·
Jest + RNTL · e2e (tester-army) · EAS · bun.

## Platform support

| Your computer | Run the app | Build iOS | Build Android | e2e tests + `e2e` MCP |
|---|---|---|---|---|
| macOS | iOS simulator, Android | local (Xcode) or EAS | local or EAS | iOS and Android |
| Linux | Android | EAS cloud | local or EAS | Android |
| Windows | Android | EAS cloud | local or EAS | WSL2 only |

iOS needs a Mac for local builds and the simulator. Without one, EAS builds iOS in the cloud
(`bun run eas build --profile development-device --platform ios`) and you install it on a registered iPhone.
Everything else (`verify`, hooks, the agents) is built to run on all three systems. Verified so far on macOS only (iOS
simulator, Android emulator); Windows and Linux are untested until the CI matrix runs. iOS e2e is not in CI.

## Prerequisites

Everywhere: [bun](https://bun.sh) ≥ 1.3.7, Node ≥ 22.12 (`.node-version` and CI use 24), Git.

| | macOS | Linux | Windows |
|---|---|---|---|
| Android | Android Studio + SDK, a JDK (Android Studio's works) | same | same; keep the repo path short (long paths break native builds) |
| iOS | Xcode (older Swift toolchains fail, see `AGENTS.md` Gotchas) | EAS only | EAS only |
| `ANDROID_HOME` | `~/Library/Android/sdk` | `~/Android/Sdk` | `%LOCALAPPDATA%\Android\Sdk` |
| `JAVA_HOME` | `/Applications/Android Studio.app/Contents/jbr/Contents/Home` | Android Studio's `jbr` folder | `C:\Program Files\Android\Android Studio\jbr` |

Claude Code on Windows also needs Git for Windows. For e2e on Windows install WSL2 and run the e2e commands inside it
(upstream: "On Windows, run inside WSL"; sharing the Windows emulator with WSL is untested). Shell snippets in the skills are
bash; in PowerShell write `$env:NAME = 'x'` instead of `NAME=x cmd`.

## Start a new app from this template

1. **Create the repo:** "Use this template" on GitHub, or `gh repo create my-app --template <owner>/expo-app-template --private --clone`. Then `bun install`.
2. **Rename it** (dry run first; add `--write` to apply):
   ```bash
   bun run rename --id com.acme.app --name "Acme" --slug acme-app
   ```
   This sets the bundle id, display name, slug and URL scheme in `app.config.ts` and `e2e/support/build-mode.ts`, the
   package name and this README's title, and the example ids in specs and skills. Replace the copyright holder in
   `LICENSE` yourself. If `ios/` or `android/` already exist, run `bunx expo prebuild --clean` afterwards.
3. **EAS:** `bun run eas login`, then `bun run eas init`. Paste the printed project id into
   `EAS_PROJECT_ID` in `app.config.ts` (a dynamic config can't be edited by `eas init`); that also enables EAS Update.
4. **Env:** `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`) and set `EXPO_PUBLIC_API_URL` for local
   development. Add `EXPO_PUBLIC_API_URL` (https) as an EAS environment variable for preview and production: `.env` is
   never uploaded, and those builds fail fast without it.
5. **First run** (a development build, not Expo Go; the first build takes several minutes):
   - macOS: `bun run ios` or `bun run android`
   - Linux / Windows: start an Android emulator or plug in a device with USB debugging, then `bun run android`
   - iOS without a Mac: the EAS build above; later sessions only need `bun run start` to serve JS.
6. **Replace the mock sign-in** in `src/app/sign-in.tsx` with your auth provider. The mock accepts any credentials, so it
   refuses to sign in on production builds.
7. **Crash reporting (optional):** set `EXPO_PUBLIC_SENTRY_DSN`, and `SENTRY_ORG` / `SENTRY_PROJECT` /
   `SENTRY_AUTH_TOKEN` as EAS environment variables for source-map upload. Until then builds still pass because
   `eas.json` sets `SENTRY_ALLOW_FAILURE=true`; remove it once Sentry works so a failed upload fails the release build.
8. **First prompt:** open the project in your agent and start with `/new-feature add a profile edit screen` (Claude Code).
   In other tools: "Read AGENTS.md, then read `.claude/skills/new-feature/SKILL.md` and follow it for: add a profile
   edit screen." `specs/example-profile-edit.md` shows the spec it writes.

## Everyday commands

| Command | What it does |
|---|---|
| `bun run verify` | typecheck, lint, unit tests, hook tests, `lint:claude`, `docs:check`, `skills:check`, `contrast:check`, `privacy:check`: run before every commit |
| `bun run doctor` | `expo-doctor` dependency and config checks |
| `bunx expo install <pkg>` | add a dependency at the SDK-compatible version (dev: `bunx expo install <pkg> -- --dev`) |
| `bun run test:e2e:android` | e2e tests on the Android emulator against the dev build (forwards Metro's port with `adb reverse` first) |
| `bun run test:e2e:ios` | e2e tests on the iOS simulator (macOS only) |
| `bun run test:e2e` / `test:e2e:list` | all e2e targets / list the tests a run would select |
| `bun run rename` | one-time app identity change (see above) |
| `bun run specs:check <slug>` | fails when an acceptance criterion in `specs/<slug>.md` has no e2e test |
| `bun run test:hooks` | tests for the Claude Code hooks |
| `bun run lint:claude` | validates every skill and agent (frontmatter, names, descriptions, MCP tools), free |
| `bun run docs:check` | fails when docs drift from the repo (scripts, paths, skill/agent lists, MCP configs) |
| `bun run skills:sync` / `skills:check` | regenerate / verify the `.agents/skills` copy after editing `.claude/skills` |
| `bun run contrast:check` | fails when a colour token pair drops below WCAG AA in either theme |
| `bun run privacy:check` | fails when a dependency needs an iOS privacy-manifest reason missing from `app.config.ts` |
| `bun run evals:skills` | opt-in, paid: checks each skill triggers on the right requests (`evals/README.md`) |

## Building a feature with an agent

In Claude Code run `/new-feature <what you want>`. It writes `specs/<slug>.md` with acceptance criteria
(`AC-1`, `AC-2`, ...) and waits for your approval, then builds with `new-screen` / `new-component` / `add-form` /
`add-store` / `api-endpoint`, writes unit tests and one e2e test per criterion, runs `/verify`, reviews with
`rn-reviewer`, and checks the result on a device with `app-tester`. Finish with `/ship`, which stops for your approval
before the commit and again before the push and pull request. The skills also work on their own.

## E2E testing (tester-army/e2e)

Tests live in `e2e/*.e2e.ts` (Playwright-style: `screen.getByTestId(...)`, `expect(...)`), config in `e2e.config.ts`.

- **Agents explore, then encode.** The `e2e` MCP server lets an agent drive the emulator/simulator (observe, tap, type)
  with no model key, then write the journey as a deterministic test. This is the mobile equivalent of Claude in Chrome.
- **Dev vs release builds.** Locally the tests run against your dev build and connect it to Metro through the
  dev-client deep link. CI uses a release-style build (`E2E_BUILD=release`) with no dev launcher.
- **Optional AI steps.** `agent.act(...)` / `agent.assert(...)` need a model: export `ANTHROPIC_API_KEY` (and
  optionally `E2E_MODEL`). Without a key those tests are skipped. Claude subscriptions can't be used; it needs an API key.
- **Telemetry is off** (`E2E_TELEMETRY_DISABLED=1` in scripts, MCP configs and Claude settings).
- **Risk:** e2e is pre-1.0 (Apache-2.0) and pinned exactly. The suite passes on an Android emulator and an iOS 26.2
  simulator. Known upstream issues: [#872](https://github.com/tester-army/e2e/issues/872) (iOS 27 `secureTextEntry` fill),
  [#830](https://github.com/tester-army/e2e/issues/830), [#841](https://github.com/tester-army/e2e/issues/841),
  [#797](https://github.com/tester-army/e2e/issues/797).

## Release and ops

Skills: `release` (build, submit, OTA update/rollback, with a fingerprint gate that refuses OTA for native changes),
`env-secrets` (adding an env var end to end with the right EAS visibility), `deep-links` and `push-notifications`
(push needs `bunx expo install expo-notifications`, `EAS_PROJECT_ID`, FCM/APNs credentials and a new native build).
Agent: `sdk-upgrader`. Production-affecting EAS commands are never pre-approved and always prompt.

## Using AI tools

The project rules live in `AGENTS.md` (single source of truth); edit that, not `CLAUDE.md` or `GEMINI.md`. Skills are
authored in `.claude/skills/`; `.agents/skills/` is a generated copy for tools that scan that folder (`bun run skills:sync`).

| Tool | Instructions | Skills | Subagents | MCP config | Secret hiding |
|---|---|---|---|---|---|
| Claude Code | `CLAUDE.md` → `AGENTS.md` | `.claude/skills` | `.claude/agents` | `.mcp.json` | hooks and permissions (enforced) |
| Codex | `AGENTS.md` | `.agents/skills` | read the agent file as a checklist | `.codex/config.toml` (trusted project; `codex mcp login expo`) | none |
| Cursor | `AGENTS.md` | `.claude/skills` and `.agents/skills` (listed twice; delete `.agents/` if Cursor-only) | reads `.claude/agents` | `.cursor/mcp.json` | `.cursorignore` (indexing only) |
| Copilot | `AGENTS.md`, `.github/copilot-instructions.md` (review checklist) | `.claude/skills` or `.agents/skills` where supported, else read the SKILL.md | read the agent file as a checklist | `.vscode/mcp.json` | none |
| Gemini CLI | `GEMINI.md` → `AGENTS.md` | `.agents/skills` | read the agent file as a checklist | `.gemini/settings.json` (trusted folder) | `.geminiignore` (`@` sharing only) |

Only Claude Code enforces the hard rules (no `.env` reads, no npm/npx, no commits on `main`, no hand edits of `ios/` or
`android/`): its hooks are TypeScript on bun and run on Windows, Linux and macOS. They are guardrails against mistakes
and prompt injection, not a sandbox; `bun run test:hooks` shows what they cover. Elsewhere keep the tool in its default
approval mode, do not auto-run MCP tools or shell commands, and review diffs against `AGENTS.md`. The ignore files are
best-effort: they do not cover Cursor's terminal or any tool's MCP calls.

In Claude Code, approve the project MCP servers when prompted (or run `/mcp`): `e2e` drives the emulator/simulator
(pinned dev dependency, telemetry off, no model key; WSL2 on Windows), and `expo` is Expo's hosted docs and EAS server
(`mcp.expo.dev`, needs an Expo login, optional). The official `expo@claude-plugins-official` plugin is disabled on purpose:
the vendored skills (pinned upstream skills from Expo and Callstack, listed in `.claude/skills/SOURCES.md`) cost about a third of
the context and carry no telemetry. Re-enable it in `.claude/settings.json` if you prefer automatic updates.

## CI

- **CI** (`.github/workflows/ci.yml`): `bun run verify` and expo-doctor on Linux; most checks (no contrast, privacy or doctor) on Windows and macOS
  (with CRLF checkout on Windows) on every PR.
- **E2E** (`.github/workflows/e2e.yml`): builds a release-style Android APK and runs the e2e suite on an emulator for PRs
  labelled `e2e`, pushes to `main`, or manual dispatch. No secrets needed. It has not run on GitHub yet: run it once with
  workflow_dispatch before making it a required check. There is no iOS job.
- **Copilot cloud agent** (`.github/workflows/copilot-setup-steps.yml`) installs bun and the dependencies before it starts.
- **Dependabot** (`.github/dependabot.yml`) updates GitHub Actions. **CODEOWNERS** (`.github/CODEOWNERS`) is fully commented
  out: replace the placeholder owner, uncomment it and enable "Require review from Code Owners" in branch protection.

## Keeping the template current

- Expo SDK upgrades: the `sdk-upgrader` agent (uses the vendored `expo-upgrade` skill), then `bun run doctor`.
- Vendored skills: refresh quarterly; steps in `.claude/skills/SOURCES.md`.
- Docs drift: `bun run docs:check` (also in CI); the `docs-keeper` agent fixes it.
- Apps created from this template don't receive later template changes automatically; port them by hand.

MIT licensed (`LICENSE`). Credits and upstream notices: `THIRD_PARTY_NOTICES.md`.
