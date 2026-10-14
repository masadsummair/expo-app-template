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
4. It reviews with `slop-reviewer` and `adversarial-reviewer` and checks the result on a device with `app-tester`.

Finish with `/ship`, which stops for your approval before the commit and again before the push and pull request. The
skills also work on their own.

## Skills

Authored for this template:

| Category | Skill | Use it to |
|---|---|---|
| Workflow | `new-feature` | ship one feature end to end: spec, plan, code, unit and e2e tests, review, device check |
| Workflow | `research` | answer a question or vet a dependency with one agent per source; every claim has a source or `UNVERIFIED`; returns a decision record and adds nothing until you approve it |
| Workflow | `verify` | run every check and report real pass/fail output |
| Workflow | `ship` | take finished work to a pull request, with approval stops before the commit and the push; needs both reviews on the current diff |
| Review | `slop-review`, `adversarial-review` | the checklists the two reviewer agents follow (invented code and leftovers; the diff against its spec, constraints, security, React Native and standards); Codex reads them from `.agents/skills` |
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
| Review | `slop-reviewer` | before every commit or PR: invented defaults, re-implemented helpers, unused abstractions, leftovers, fake tests (follows `slop-review`) |
| Review | `adversarial-reviewer` | before every commit or PR: the diff against the spec ACs, agreed constraints, security, React Native and `docs/standards.md` (follows `adversarial-review`) |
| Review | `mobile-security-auditor` | auth, tokens, storage, deep links, env, network or permissions changed |
| Review | `a11y-auditor` | UI changes: roles, labels, headings, contrast, touch targets, reduce motion, screen sizes |
| Review | `perf-auditor` | slow screens or lists, bundle growth, new dependencies; measured evidence only |
| Testing | `app-tester` | after UI or navigation changes: drives the device over the `e2e` MCP, then writes the e2e test |
| Maintenance | `docs-keeper` | after changing scripts, `.claude/`, layout, env vars or the stack: fixes doc drift |
| Maintenance | `sdk-upgrader` | moving to a newer Expo SDK; never builds production, publishes or pushes |

In tools without subagents, read the agent file and follow its checklist; the two reviewers point at their skills
(`slop-review`, `adversarial-review`) in `.agents/skills`.

## Hooks and permissions (Claude Code)

The hooks (`.claude/hooks`, wired in `.claude/settings.json`) are TypeScript on bun, so they run the same on Windows,
Linux and macOS (no `jq`, no bash). Each runs through `run.ts`, which blocks the call if a guard fails to load or
crashes; bad input also blocks. `bun run test:hooks` runs their tests (part of `verify`). If `bun` itself is missing, no
hook can run. Each hook explains its denial when it fires; this is the full catalogue.

- `guard-bash` (matches `Bash` and `PowerShell`) denies `npm`/`yarn`/`pnpm` installs, `npx`, `bun add|update|remove|link|create`,
  global installs, `@latest` and other unpinned runners (and runners fetched from a git repo or URL), shell access to `.env*` (including Windows `.env.`, `.env::$DATA`
  and `ENV~1` spellings, plus heredoc and `curl -F @file` tricks) and to credential files (keystores, `.p8`, EAS credentials files, `~/.expo`, `~/.config/e2e`, agent and git
  logins), recursive grep/rg/`git grep` that would sweep `.env`, including an rg `-g` glob that matches it (pass
  `--exclude='.env*'` or `-g '!.env*'`, or search a subfolder), jest/eslint flags that load other files (`--config`, `--globalSetup`...), env dumps and secret env reads
  (also `Env:`, `[Environment]::GetEnvironmentVariable`, `iex`), EAS and GitHub token reads, `e2e --config` and `e2e feedback`,
  recursive deletes of home or the project, commits on protected branches and force pushes to `main`.
  `git … --output` counts as a write and is denied for protected files. It asks before `git push`, `gh pr merge`,
  `e2e login|logout`, EAS submit, update, channel, credentials, env writes and production builds (or a build with no
  `--profile`). It parses pipes, `$()`, `bash -c` and `eval`, and checks shell write targets.
- `guard-files` denies reads and edits of `.env*` (and a Grep `glob` that matches it), edits of `ios/` and `android/`, and secret-looking `EXPO_PUBLIC_*`
  names. It asks before edits to `package.json`, `bun.lock`, tool and TS configs, `app.config.ts`, `eas.json`,
  `scripts/`, `e2e/`, `test/setup.ts`, `.github/`, `.vscode/`, `.codex/`,
  `bunfig.toml`, `.npmrc`, `.claude/` (everything in it), `.agents/`, `CLAUDE.md`,
  `.fingerprintignore`, `.githooks/`, `.husky/`, lefthook config and `.mcp.json`. Path checks ignore case.
- `lint-changed` lints each file after you edit it.
- `.claude/settings.json` also denies Read of credential files and asks before `git push`, `gh pr merge` and production-affecting EAS commands.

The hooks are guardrails against mistakes and prompt injection, not a sandbox. If a hook blocks a command, do not work
around it: report the command and the message.

## MCP servers

| Server | What it does | Needs |
|---|---|---|
| `e2e` | lets an agent drive the emulator/simulator (observe, tap, type), then write the test | a booted device; pinned dev dependency, telemetry off, no model key; WSL2 on Windows |
| `expo` | Expo's hosted docs and EAS server (`mcp.expo.dev`) | an Expo login; optional |

Approve them when prompted, or run `/mcp` in Claude Code. The official `expo@claude-plugins-official` plugin is
disabled on purpose: the vendored skills cost less context and carry no telemetry. Re-enable it in
`.claude/settings.json` if you prefer automatic updates.

## Standards

`standards/core.json`, `standards/design.json` and `standards/variant.json` hold the project's goals, non-goals and the
rules that need a written reason or someone's judgement, each keyed by an ID such as `core.typescript-only`.
`docs/standards.md` is generated from them (`bun run standards:gen`) and is never edited by hand. Rules that a tool
already enforces and explains (formatting, promises, secrets, the doc budget) have no entry. Agents cite a rule as
`path:line [rule.id]`.

## Kit checks

| Command | What it does |
|---|---|
| `bun run test:hooks` | tests for the Claude Code hooks |
| `bun run test:tooling` | tests for the repo's own checks (`test/tooling/`): each check must fail when it should |
| `bun run lint:claude` | validates every skill and agent (frontmatter, names, descriptions, MCP tools) and that every `*-reviewer` agent includes the `REVIEW-COMPLETE` marker, free |
| `bun run docs:check` | fails when docs drift from the repo (scripts, paths, skill/agent lists, MCP configs), when `standards/*.json` break their schema or `docs/standards.md` is stale, and when `AGENTS.md` / `CLAUDE.md` outgrow their size budget |
| `bun run standards:gen` | regenerate `docs/standards.md` from `standards/*.json` |
| `bun run skills:sync` / `skills:check` | regenerate / verify the `.agents/skills` copy after editing `.claude/skills` |
