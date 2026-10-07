# Expo App Template (agent-ready)

My personal starting point for English-only mobile MVPs on iOS and Android. AI coding agents (Claude Code first, plus
Codex) build features here with project rules, skills, subagents and guard hooks. Phone-first,
portrait.

- **Stack:** Expo SDK 57 · React Native 0.86 · React 19.2 (React Compiler) · TypeScript · Expo Router · Uniwind
  (Tailwind 4) · TanStack Query · Zustand · React Hook Form + zod · bun
- **Runs on:** macOS, Linux and Windows. iOS builds without a Mac go through EAS. iPad runs the iPhone layout.
- **Checked:** on macOS (iOS simulator, Android emulator); the checks also passed on Windows and Linux, and the e2e
  suite on a Linux Android emulator. Not yet checked: a physical iPhone, screen readers by ear, haptics feel.

## Quick start

Needs bun ≥ 1.3.7, Node ≥ 22.12, Git, and Android Studio (or Xcode on a Mac) with an emulator or simulator running.
Per-OS details: [docs/setup.md](docs/setup.md).

```bash
git clone --depth 1 https://github.com/masadsummair/expo-app-template my-app
cd my-app
rm -rf .git          # PowerShell: Remove-Item -Recurse -Force .git
git init
bun install          # also turns on the pre-commit hook

bun run rename --id com.acme.app --name "Acme" --slug acme-app --write   # applies now; drop --write to preview
bun install && bun run skills:sync   # pick up the new name and renamed ids
cp .env.example .env # set EXPO_PUBLIC_API_URL
bun run android      # or: bun run ios (macOS)
```

Then, from [docs/setup.md](docs/setup.md): connect EAS (step 3), replace the mock sign-in (step 6) and, optionally, set
up Sentry (step 7).

## Daily workflow

1. **Build a feature with an agent.** In Claude Code: `/new-feature <what you want>`. It writes a spec, waits for your
   approval, builds it with tests, reviews it and checks it on a device. Other tools: read `AGENTS.md`, then follow
   `.claude/skills/new-feature/SKILL.md`.
2. **Commit.** The pre-commit hook runs `bun run verify` (typecheck, lint, unit tests and the repo checks) and blocks
   the commit if anything fails. The template ships no CI; add your own if you want it.
3. **Ship.** `/ship` opens the pull request, with approval stops before the commit and the push.

## Commands

| Command | What it does |
|---|---|
| `bun run start` | dev server for the development build |
| `bun run ios` / `bun run android` | build and run on the iOS simulator (macOS) or Android |
| `bun run verify` | every check; the pre-commit hook runs it |
| `bun run doctor` | Expo dependency and config checks |
| `bun run test:e2e:android` / `test:e2e:ios` | on-device e2e tests (needs a booted emulator or simulator) |
| `bunx expo install <pkg>` | add a dependency at the SDK-compatible version (dev: `bunx expo install <pkg> -- --dev`) |
| `bun run eas <command>` | EAS CLI, pinned (build, submit, update) |
| `bun run rename` | one-time app identity change |

## What's inside

- **App:** a UI kit of 19 accessible components, mock sign-in, Home, Settings, an About sheet and an offline banner.
  Layouts are checked from a 360dp phone to an 800dp tablet and at large text sizes.
- **Data:** a typed, cancellable API client, TanStack Query wired to network and app state, persisted Zustand stores,
  and a SecureStore token.
- **AI kit:** `AGENTS.md` rules, 25 skills, 7 review and test subagents, Claude Code guard hooks, and the `e2e` and
  `expo` MCP servers.
- **Testing:** Jest + Testing Library, tester-army e2e on device (optional AI steps on your ChatGPT, Copilot, OpenCode
  or SuperGrok subscription), and contrast, privacy-manifest and docs-drift checks.
- **Release:** EAS Build, Submit and Update, three app variants, and R8-minified Android release builds.

## Docs

| Doc | What's in it |
|---|---|
| [docs/setup.md](docs/setup.md) | prerequisites per OS, accounts, every step to start a new app |
| [docs/stack.md](docs/stack.md) | every tool by category, and what's in the app |
| [docs/ai-kit.md](docs/ai-kit.md) | AI tool support, the feature workflow, skills, subagents, hooks, MCP servers |
| [docs/testing.md](docs/testing.md) | pre-commit checks, e2e tests, AI steps on a subscription, optional CI |
| [docs/release.md](docs/release.md) | builds, OTA updates, env vars, SDK upgrades, keeping the template current |
| [AGENTS.md](AGENTS.md) | the rules every agent follows, and the gotchas found in this template |

MIT licensed (`LICENSE`). Credits and upstream notices: `THIRD_PARTY_NOTICES.md`.
