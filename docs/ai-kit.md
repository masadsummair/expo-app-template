# AI kit

The project rules live in `AGENTS.md`, the single source of truth. Edit that, not `CLAUDE.md`, which
imports it. Skills are authored in `.claude/skills/`; `.agents/skills/` is a generated copy for tools that scan that
folder (`bun run skills:sync`).

## Tool support

| Tool | Instructions | Skills | Subagents | MCP config | Secret hiding |
|---|---|---|---|---|---|
| Claude Code | `CLAUDE.md` → `AGENTS.md` | `.claude/skills` | `.claude/agents` | `.mcp.json` | hooks and permissions (enforced) |
| Codex | `AGENTS.md` | `.agents/skills` | read the agent file as a checklist | `.codex/config.toml` (trusted project; `codex mcp login expo`) | none |

Only Claude Code enforces the hard rules (no `.env` reads, no npm/npx, no commits on `main`, no hand edits of `ios/` or
`android/`). In other tools, keep the default approval mode, don't auto-run MCP tools or shell commands, and review
diffs against `AGENTS.md`.

## Building a feature with an agent

In Claude Code run `/new-feature <what you want>`.

1. It writes `specs/<slug>.md` with acceptance criteria (`AC-1`, `AC-2`, ...) and waits for your approval.
2. It builds with `new-screen`, `new-component`, `add-form`, `add-store` and `api-endpoint`.
3. It writes unit tests and one e2e test per criterion, then runs `/verify`.
4. It reviews with `rn-reviewer` and checks the result on a device with `app-tester`.

Finish with `/ship`, which stops for your approval before the commit and again before the push and pull request. The
skills also work on their own.

## Skills

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

## Subagents (`.claude/agents/`)

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

## Hooks and permissions (Claude Code)

| Hook | Blocks or asks |
|---|---|
| `guard-bash` | denies npm/npx/`bun add`, `.env` and credential reads (including recursive searches, heredoc and `curl -F @file` tricks), env dumps, EAS secret reads, code-loading test/lint flags, commits on `main`, force pushes, and git `--output` writes to protected files; asks before `git push`, EAS submit, update, credentials and production builds |
| `guard-files` | denies `.env` reads and edits, and edits of `ios/` and `android/`; asks before edits to configs, scripts, `.githooks/`, `.claude/` and MCP files |
| `lint-changed` | lints each file after an edit |
| `.claude/settings.json` | asks before `git push` and `gh pr merge` |

The hooks are TypeScript on bun, so they behave the same on Windows, Linux and macOS (no bash, no `jq`). A launcher
blocks the call if a guard fails to load. They're guardrails against mistakes and prompt injection, not a sandbox;
`bun run test:hooks` shows what they cover.

## MCP servers

| Server | What it does | Needs |
|---|---|---|
| `e2e` | lets an agent drive the emulator/simulator (observe, tap, type), then write the test | a booted device; pinned dev dependency, telemetry off, no model key; WSL2 on Windows |
| `expo` | Expo's hosted docs and EAS server (`mcp.expo.dev`) | an Expo login; optional |

Approve them when prompted, or run `/mcp` in Claude Code. The official `expo@claude-plugins-official` plugin is
disabled on purpose: the vendored skills cost less context and carry no telemetry. Re-enable it in
`.claude/settings.json` if you prefer automatic updates.

## Kit checks

| Command | What it does |
|---|---|
| `bun run test:hooks` | tests for the Claude Code hooks |
| `bun run lint:claude` | validates every skill and agent (frontmatter, names, descriptions, MCP tools), free |
| `bun run docs:check` | fails when docs drift from the repo (scripts, paths, skill/agent lists, MCP configs) |
| `bun run skills:sync` / `skills:check` | regenerate / verify the `.agents/skills` copy after editing `.claude/skills` |
