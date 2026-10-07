# Expo App Template (agent-ready)

A production starting point for English-only mobile MVPs, built so AI coding agents (Claude Code first, plus Codex,
Cursor and Gemini CLI) can plan, build, test on a device, review and ship features with project-specific rules,
skills, agents and hooks. Phone-first, portrait. One codebase for iOS and Android.

**Contents:** [At a glance](#at-a-glance) · [What you need](#what-you-need) ·
[Tools by category](#tools-by-category) · [What's in the app](#whats-in-the-app) ·
[Start a new app](#start-a-new-app-from-this-template) · [AI tools](#ai-tools) · [Commands](#everyday-commands) ·
[Feature workflow](#building-a-feature-with-an-agent) · [E2E](#e2e-testing-tester-armye2e) · [Release](#release-and-ops) ·
[Checks before commit](#checks-before-commit)

## At a glance

| Area | Supported |
|---|---|
| Mobile platforms | iOS and Android (development builds; iPad runs the iPhone layout) |
| Your computer | macOS, Linux, Windows (iOS builds without a Mac go through EAS) |
| AI coding tools | Claude Code (skills, subagents, hooks, MCP), Codex, Cursor, Gemini CLI |
| AI kit | 25 skills (13 authored, 11 vendored, 1 adapted), 7 subagents, 3 hooks, 2 MCP servers |
| Testing | unit tests, on-device e2e tests, 9 checks in one `bun run verify` |
| Checks | local: a git pre-commit hook runs `bun run verify`; optional GitHub Actions in `examples/github-actions/` |
| Releases | EAS Build, Submit and Update (OTA), three app variants |

Verified on macOS (iOS simulator, Android emulator). The checks have also passed on Windows and Linux, and the e2e
suite on a Linux Android emulator. Not yet checked: a physical iPhone, screen readers by ear, haptics feel.

## What you need

| | macOS | Linux | Windows |
|---|---|---|---|
| Always | bun ≥ 1.3.7, Node ≥ 22.12, Git | same | same, plus Git for Windows (Claude Code uses its bash) |
| Android | Android Studio + SDK and its JDK | same | same; keep the repo path short (long paths break native builds) |
| iOS | Xcode ≥ 26.4 (older toolchains fail, see `AGENTS.md` Gotchas) | EAS cloud build only | EAS cloud build only |
| `ANDROID_HOME` | `~/Library/Android/sdk` | `~/Android/Sdk` | `%LOCALAPPDATA%\Android\Sdk` |
| `JAVA_HOME` | `/Applications/Android Studio.app/Contents/jbr/Contents/Home` | Android Studio's `jbr` folder | `C:\Program Files\Android\Android Studio\jbr` |
| e2e tests | iOS and Android | Android | inside WSL2 (upstream: "On Windows, run inside WSL") |

Accounts: an [Expo](https://expo.dev) account for EAS (free tier works for Android development builds). An Apple
Developer Program membership (paid) is required for iOS device builds and the App Store; the iOS simulator on a Mac does not need one. Optional: a Google Play account, Sentry, and a model for the AI steps in
e2e tests: a ChatGPT, GitHub Copilot, OpenCode Console or SuperGrok subscription, or an Anthropic API key. `.node-version` pins Node 24. Shell snippets in the skills are bash; in PowerShell write
`$env:NAME = 'x'` instead of `NAME=x cmd`.

## Tools by category

### App framework

| Tool | What it does here |
|---|---|
| Expo SDK 57 | native modules, config plugins, development builds (not Expo Go) |
| React Native 0.86 · React 19.2 | New Architecture, Hermes, React Compiler (no manual memoisation) |
| TypeScript (strict) | the whole app, scripts and hooks |
| Expo Router | file-based routes in `src/app`, native Stack, `Stack.Protected` auth guard, native form sheets |

### UI, styling and motion

| Tool | What it does here |
|---|---|
| Uniwind (Tailwind 4) | `className` styling with light/dark design tokens in `src/global.css` |
| `@/components/ui` | the template's UI kit (see [What's in the app](#whats-in-the-app)) |
| Reanimated 4 + Worklets | animations, with presets in `src/lib/motion.ts` that follow reduce-motion |
| Gesture Handler | gestures and the root gesture view |
| react-native-keyboard-controller | keyboard-aware scrolling and a footer pinned above the keyboard |
| react-native-safe-area-context | safe-area insets (Android is edge-to-edge) |
| FlashList | long lists, with pull to refresh |
| expo-image | images with caching and recycling |
| expo-symbols | icons: SF Symbols on iOS, Material Symbols on Android |
| sonner-native + react-native-svg | toasts |
| expo-haptics | haptics with native constants per platform |
| expo-splash-screen · expo-status-bar · expo-system-ui | splash, status bar and root background per theme |

### Data, state and forms

| Tool | What it does here |
|---|---|
| TanStack Query | server data, wired to network status and app focus |
| zod | validates API responses, env vars, forms and persisted state |
| Zustand | client state (auth, theme) |
| react-native-mmkv | fast local storage for persisted state |
| expo-secure-store | the auth token |
| React Hook Form + `@hookform/resolvers` | forms with zod validation |
| expo-network | online/offline detection and the offline banner |

### Errors, updates and app info

| Tool | What it does here |
|---|---|
| Sentry (`@sentry/react-native`) | crash reporting, on only when `EXPO_PUBLIC_SENTRY_DSN` is set |
| expo-updates | OTA updates with an in-app "Restart" prompt |
| expo-constants · expo-linking · expo-font | app version, deep links, icon font preloading |

### Build and release

| Tool | What it does here |
|---|---|
| EAS Build / Submit / Update (`bun run eas`) | cloud builds, store submission, OTA updates; eas-cli pinned to one version |
| expo-dev-client | the development build you run day to day |
| `@expo/fingerprint` | runtime versions and the "native change, no OTA" gate |
| expo-doctor | dependency and config checks |

### Testing and quality

| Tool | What it does here |
|---|---|
| Jest + React Native Testing Library | unit and component tests |
| tester-army `e2e` | on-device e2e tests and the `e2e` MCP server (agents drive the device) |
| ESLint (expo config) | lint, including React Compiler rules |
| `scripts/check-contrast.ts` | WCAG AA contrast for every colour pair, both themes |
| `scripts/check-privacy-manifest.ts` | iOS privacy-manifest reasons for every native dependency |
| `scripts/check-docs.ts` · `scripts/lint-claude.ts` | docs match the repo; skills and agents are valid |

### AI agent kit

| Tool | What it does here |
|---|---|
| `AGENTS.md` | the rules every agent follows (CLAUDE.md and GEMINI.md import it) |
| Skills (`.claude/skills`, copy in `.agents/skills`) | step-by-step playbooks for common tasks (see [Skills](#skills)) |
| Subagents (`.claude/agents`) | reviewers, auditors, device tester, docs keeper, SDK upgrader |
| Hooks (`.claude/hooks`) | guardrails that block risky commands in Claude Code |
| MCP servers | `e2e` (drive the emulator/simulator) and `expo` (Expo docs + EAS) |
| Evals (`evals/`) | opt-in, paid checks that each skill triggers on the right requests |

### Repo and local checks

| Tool | What it does here |
|---|---|
| git pre-commit hook (`.githooks/pre-commit`) | runs `bun run verify` before every commit; turned on by `bun install` |
| `examples/github-actions/` | optional CI (checks, Android e2e, Dependabot) to copy into `.github/` if your app wants it |
| bun | package manager and script runner (never npm, yarn or pnpm) |
| `.gitattributes` · `.editorconfig` | LF line endings, so Windows checkouts don't break scripts |

## What's in the app

| Part | Details |
|---|---|
| UI kit | Screen, Text, Button, TextField, Card, Divider, ListItem, Icon, Image, Avatar, Badge, Switch, LoadingView, EmptyState, ErrorState, RefreshableList, PressableScale, SheetHeader. Each has a testID, accessibility role and label, 44pt/48dp tap targets and both themes. |
| Screens | mock sign-in (keyboard flow, inline validation), Home, Settings (theme, sign out, delete account with confirmation), About form sheet, route error boundaries, offline banner |
| Layout | `Screen` caps content at 576dp and centres it on tablets and foldables, applies safe-area insets on every side, and pins a form's main button above the keyboard. Checked at 360dp, 800dp, iPhone SE and large text. |
| Helpers (`src/lib`) | API client (typed results, cancellable, refuses other hosts), error messages, toast and confirm, haptics, motion presets, screen-reader announcements, analytics adapter, crash reporting, storage |
| Hooks (`src/hooks`) | online status, refresh on focus, debounced value, OTA update check |
| Config | zod-validated env (`src/config/env.ts`), feature flags, three variants (development, preview, production) with their own bundle ids, iOS privacy manifest, export-compliance flag |

## Start a new app from this template

1. **Create the repo:** "Use this template" on GitHub, or `gh repo create my-app --template <owner>/expo-app-template --private --clone`. Then `bun install`.
2. **Rename it** (dry run first; add `--write` to apply):
   ```bash
   bun run rename --id com.acme.app --name "Acme" --slug acme-app
   ```
   This sets the bundle id, display name, slug and URL scheme in `app.config.ts` and `e2e/support/build-mode.ts`, the
   package name and this README's title, and the example ids in specs, skills and agents. Then run `bun install` and
   `bun run skills:sync`. If `ios/` or `android/` already exist, run `bunx expo prebuild --clean` afterwards.
3. **EAS:** `bun run eas login`, then `bun run eas init`. Paste the printed project id into
   `EAS_PROJECT_ID` in `app.config.ts` (a dynamic config can't be edited by `eas init`); that also enables EAS Update.
4. **Env:** `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`) and set `EXPO_PUBLIC_API_URL` for local
   development. Add `EXPO_PUBLIC_API_URL` (https) as an EAS environment variable for preview and production: `.env` is
   never uploaded, and those builds fail fast without it.
5. **First run** (a development build, not Expo Go; the first build takes several minutes):
   - macOS: `bun run ios` or `bun run android`
   - Linux / Windows: start an Android emulator or plug in a device with USB debugging, then `bun run android`
   - iOS without a Mac: needs a paid Apple Developer Program membership and a registered iPhone. Run
     `bun run eas device:create`, then `bun run eas build --profile development-device --platform ios` and install it;
     later sessions only need `bun run start` to serve JS.
6. **Replace the mock sign-in** in `src/app/sign-in.tsx` with your auth provider. The mock accepts any credentials, so it
   refuses to sign in on production builds. The e2e fixtures (`e2e/support/open-app.ts`) and the agent `context` in
   `e2e.config.ts` depend on the testIDs `sign-in-screen`, `home-screen` and `home-sign-out`: update them with the new auth and Home.
7. **Crash reporting (optional):** set `EXPO_PUBLIC_SENTRY_DSN`, and `SENTRY_ORG` / `SENTRY_PROJECT` /
   `SENTRY_AUTH_TOKEN` as EAS environment variables for source-map upload. Until then builds still pass because
   `eas.json` sets `SENTRY_ALLOW_FAILURE=true`; remove it once Sentry works so a failed upload fails the release build.
8. **First prompt:** open the project in your agent and start with `/new-feature add a profile edit screen` (Claude Code).
   In other tools: "Read AGENTS.md, then read `.claude/skills/new-feature/SKILL.md` and follow it for: add a profile
   edit screen." `specs/example-profile-edit.md` shows the spec it writes.

## AI tools

The project rules live in `AGENTS.md` (single source of truth); edit that, not `CLAUDE.md` or `GEMINI.md`. Skills are
authored in `.claude/skills/`; `.agents/skills/` is a generated copy for tools that scan that folder (`bun run skills:sync`).

| Tool | Instructions | Skills | Subagents | MCP config | Secret hiding |
|---|---|---|---|---|---|
| Claude Code | `CLAUDE.md` → `AGENTS.md` | `.claude/skills` | `.claude/agents` | `.mcp.json` | hooks and permissions (enforced) |
| Codex | `AGENTS.md` | `.agents/skills` | read the agent file as a checklist | `.codex/config.toml` (trusted project; `codex mcp login expo`) | none |
| Cursor | `AGENTS.md` | `.claude/skills` and `.agents/skills` (listed twice; delete `.agents/` if Cursor-only) | reads `.claude/agents` | `.cursor/mcp.json` | `.cursorignore` (indexing only) |
| Gemini CLI | `GEMINI.md` → `AGENTS.md` | `.agents/skills` | read the agent file as a checklist | `.gemini/settings.json` (trusted folder) | `.geminiignore` (`@` sharing only) |

Only Claude Code enforces the hard rules (no `.env` reads, no npm/npx, no commits on `main`, no hand edits of `ios/` or
`android/`). Elsewhere keep the tool in its default approval mode, do not auto-run MCP tools or shell commands, and
review diffs against `AGENTS.md`. The ignore files are best-effort: they do not cover Cursor's terminal or any tool's MCP
calls.

### Skills

Authored for this template:

| Category | Skill | Use it to |
|---|---|---|
| Workflow | `new-feature` | ship one feature end to end: spec, plan, code, unit and e2e tests, review, device check |
| Workflow | `verify` | run every check and report real pass/fail output |
| Workflow | `ship` | take finished work to a pull request, with approval stops before the commit and the push |
| Build | `new-screen`, `new-component` | add a route or a reusable component with the layout, states, tokens and testIDs |
| Build | `add-form`, `add-store`, `api-endpoint` | add a validated form, a Zustand store, or a typed API call with TanStack Query |
| Platform | `env-secrets` | add an environment variable end to end (schema, `.env.example`, EAS visibility) |
| Platform | `deep-links`, `push-notifications` | custom-scheme and universal links; Expo push notifications |
| Release | `release` | build, submit, OTA update and rollback, version bumps, with a fingerprint gate |
| Testing | `e2e-flow` | explore the device over MCP, then write and run an e2e test; screen-size checks |
| Debugging | `debug-rn` | diagnosis loop for bugs and crashes (adapted from Matt Pocock's skills) |

Vendored from upstream and pinned (`.claude/skills/SOURCES.md`; template overrides sit at the top of each):

| Source | Skills |
|---|---|
| Expo | `expo-router`, `expo-native-ui`, `expo-animation`, `expo-data-fetching`, `expo-dev-client`, `expo-project-structure`, `expo-upgrade`, `eas-app-stores`, `eas-update` |
| Callstack | `react-native-best-practices`, `react-native-testing` |

### Subagents (`.claude/agents/`)

| Category | Agent | When |
|---|---|---|
| Review | `rn-reviewer` | before every commit or PR: logic bugs, React Native anti-patterns, rule violations |
| Review | `mobile-security-auditor` | auth, tokens, storage, deep links, env, network or permissions changed |
| Review | `a11y-auditor` | UI changes: roles, labels, headings, contrast, touch targets, reduce motion, screen sizes |
| Review | `perf-auditor` | slow screens or lists, bundle growth, new dependencies; measured evidence only |
| Testing | `app-tester` | after UI or navigation changes: drives the device over the `e2e` MCP, then writes the e2e test |
| Maintenance | `docs-keeper` | after changing scripts, `.claude/`, layout, env vars or the stack: fixes doc drift |
| Maintenance | `sdk-upgrader` | moving to a newer Expo SDK; never builds production, publishes or pushes |

In tools without subagents, read the agent file and follow its checklist.

### Hooks and permissions (Claude Code)

| Hook | Blocks or asks |
|---|---|
| `guard-bash` | denies npm/npx/`bun add`, `.env` and credential reads (including heredoc and `curl -F @file` tricks), env dumps, EAS secret reads, commits on `main`, force pushes, and git `--output` writes to protected files; asks before EAS submit, update, credentials and production builds |
| `guard-files` | denies `.env` reads and edits, and edits of `ios/` and `android/`; asks before edits to configs, scripts, CI, `.claude/` and MCP files |
| `lint-changed` | lints each file after an edit |
| `.claude/settings.json` | asks before `git push` and `gh pr merge` |

The hooks are TypeScript on bun, so they behave the same on Windows, Linux and macOS (no bash, no `jq`). A launcher
blocks the call if a guard fails to load. They are guardrails against mistakes and prompt injection, not a sandbox;
`bun run test:hooks` shows what they cover.

### MCP servers

| Server | What it does | Needs |
|---|---|---|
| `e2e` | lets an agent drive the emulator/simulator (observe, tap, type), then write the test | a booted device; pinned dev dependency, telemetry off, no model key; WSL2 on Windows |
| `expo` | Expo's hosted docs and EAS server (`mcp.expo.dev`) | an Expo login; optional |

Approve them when prompted (or run `/mcp` in Claude Code). The official `expo@claude-plugins-official` plugin is
disabled on purpose: the vendored skills cost less context and carry no telemetry. Re-enable it in
`.claude/settings.json` if you prefer automatic updates.

## Everyday commands

| Category | Command | What it does |
|---|---|---|
| Run | `bun run start` / `ios` / `android` | dev server for the dev build / build and run on iOS (macOS) or Android |
| Check | `bun run verify` | typecheck, lint, unit tests, hook tests, `lint:claude`, `docs:check`, `skills:check`, `contrast:check`, `privacy:check`: run before every commit |
| Check | `bun run doctor` | `expo-doctor` dependency and config checks |
| Dependencies | `bunx expo install <pkg>` | add a dependency at the SDK-compatible version (dev: `bunx expo install <pkg> -- --dev`) |
| Release | `bun run eas <command>` | EAS CLI, pinned to one version (`eas build`, `submit`, `update`, ...) |
| E2E | `bun run test:e2e:android` | e2e tests on the Android emulator against the dev build (forwards Metro's port with `adb reverse` first) |
| E2E | `bun run test:e2e:ios` | e2e tests on the iOS simulator (macOS only) |
| E2E | `bun run test:e2e` / `test:e2e:list` | all e2e targets / list the tests a run would select |
| Setup | `bun run rename` | one-time app identity change (see above) |
| Specs | `bun run specs:check <slug>` | fails when an acceptance criterion in `specs/<slug>.md` has no e2e test |
| AI kit | `bun run test:hooks` | tests for the Claude Code hooks |
| AI kit | `bun run lint:claude` | validates every skill and agent (frontmatter, names, descriptions, MCP tools), free |
| AI kit | `bun run docs:check` | fails when docs drift from the repo (scripts, paths, skill/agent lists, MCP configs) |
| AI kit | `bun run skills:sync` / `skills:check` | regenerate / verify the `.agents/skills` copy after editing `.claude/skills` |
| AI kit | `bun run evals:skills` | opt-in, paid: checks each skill triggers on the right requests (`evals/README.md`) |
| Design | `bun run contrast:check` | fails when a colour token pair drops below WCAG AA in either theme |
| iOS | `bun run privacy:check` | fails when a dependency needs an iOS privacy-manifest reason missing from `app.config.ts` |

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
  dev-client deep link. `E2E_BUILD=release` runs the suite against a release-style build with no dev launcher.
- **Optional AI steps.** `agent.act(...)` / `agent.assert(...)` need a model. Without one those tests are skipped and
  the rest of the suite still runs. Use a subscription you already pay for, or an API key:

  | Model source | Set up | Starting model (example id) |
  |---|---|---|
  | ChatGPT Plus or Pro | `bunx --no-install e2e login openai` | `gpt-6-luna` |
  | GitHub Copilot (includes Claude models) | `bunx --no-install e2e login github-copilot` | `claude-sonnet-5` |
  | OpenCode Console (Zen / Go) | `bunx --no-install e2e login opencode-console` | `deepseek-v4.1-flash` |
  | SuperGrok or X Premium+ | `bunx --no-install e2e login spacexai` | `grok-4` |
  | Anthropic API key | export `ANTHROPIC_API_KEY` | `claude-sonnet-5-5` |

  Agent steps are opt-in: set `E2E_AGENT=1` (or `E2E_MODEL_PROVIDER`), otherwise they are skipped even with a key or
  login present. The config picks `E2E_MODEL_PROVIDER` (`anthropic`, `chatgpt`, `copilot`, `opencode`, `grok`) when set, else the API
  key (`ANTHROPIC_API_KEY`, then `OPENCODE_API_KEY`), else your one stored login; with several logins set
  `E2E_MODEL_PROVIDER`. The starting ids are examples from the e2e docs: run `bunx --no-install e2e models` to list the ids
  your plan serves and set one with `E2E_MODEL`, which applies to whichever provider is selected. Subscriptions use your plan's limits. Claude subscriptions are not supported
  upstream: use an API key, or Claude models through Copilot. Logic: `e2e/support/model.ts`.
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

## Checks before commit

There is no CI/CD on GitHub: checks run on your machine.

- **Pre-commit hook:** `.githooks/pre-commit` runs `bun run verify` (typecheck, lint, unit tests, hook tests,
  `lint:claude`, `docs:check`, `skills:check`, `contrast:check`, `privacy:check`) and blocks the commit if anything fails.
  `bun install` turns it on (the `prepare` script sets `git config core.hooksPath .githooks`). Skip it once, deliberately, with
  `git commit --no-verify`.
- **Before a release or a big UI change:** also run `bun run doctor` and the e2e suite on a device
  (`bun run test:e2e:android`, and `test:e2e:ios` on macOS). They need a booted emulator or simulator, so the hook does
  not run them.
- **Want CI/CD?** That's your app's call. Ready-made GitHub Actions (checks on Linux/Windows/macOS, Android e2e on an
  emulator, Dependabot) are in `examples/github-actions/`: copy them into `.github/` (see its README).
- **CODEOWNERS** (`.github/CODEOWNERS`) is fully commented out: replace the placeholder owner, uncomment it and enable
  "Require review from Code Owners" in branch protection.

## Keeping the template current

- Expo SDK upgrades: the `sdk-upgrader` agent (uses the vendored `expo-upgrade` skill), then `bun run doctor`.
- Vendored skills: refresh quarterly; steps in `.claude/skills/SOURCES.md`.
- Docs drift: `bun run docs:check` (also in the pre-commit hook); the `docs-keeper` agent fixes it.
- Apps created from this template don't receive later template changes automatically; port them by hand.

MIT licensed (`LICENSE`). Credits and upstream notices: `THIRD_PARTY_NOTICES.md`.
