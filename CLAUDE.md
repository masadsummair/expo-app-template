@AGENTS.md

# Claude Code specifics (layered on top of AGENTS.md)

All project rules live in `AGENTS.md`. This file holds only what applies to Claude Code. When a rule here conflicts
with a vendored skill in `.claude/skills/`, `AGENTS.md` and this file win.

## Hooks (`.claude/hooks`, wired in `.claude/settings.json`)

TypeScript on bun, so they run the same on Windows, Linux and macOS (no `jq`, no bash). Each runs through `run.ts`, which
blocks the call if a guard fails to load or crashes; bad input also blocks. `bun run test:hooks` runs their tests (part
of `verify`). If `bun` itself is missing, no hook can run.

- `guard-bash` (matches `Bash` and `PowerShell`) denies `npm`/`yarn`/`pnpm` installs, `npx`, `bun add|update|remove|link|create`,
  global installs, `@latest` and other unpinned runners (and runners fetched from a git repo or URL), shell access to `.env*` (including Windows `.env.`, `.env::$DATA`
  and `ENV~1` spellings) and to credential files (keystores, `.p8`, EAS credentials files, `~/.expo`, `~/.config/e2e`, agent and git
  logins), recursive grep/rg/`git grep` that would sweep `.env`, including an rg `-g` glob that matches it (pass
  `--exclude='.env*'` or `-g '!.env*'`, or search a subfolder), jest/eslint flags that load other files (`--config`, `--globalSetup`...), env dumps and secret env reads
  (also `Env:`, `[Environment]::GetEnvironmentVariable`, `iex`), EAS and GitHub token reads, `e2e --config` and `e2e feedback`,
  recursive deletes of home or the project, commits on protected branches and force pushes to `main`.
  `git … --output` counts as a write and is denied for protected files. It asks before `git push`, `gh pr merge`,
  `e2e login|logout`, EAS submit, update, channel, credentials, env writes and production builds (or a build with no
  `--profile`). It parses pipes, `$()`, `bash -c` and `eval`, and checks shell write targets.
- `guard-files` denies reads and edits of `.env*` (and a Grep `glob` that matches it), edits of `ios/` and `android/`, and secret-looking `EXPO_PUBLIC_*`
  names. It asks before edits to `package.json`, `bun.lock`, tool and TS configs, `app.config.ts`, `eas.json`,
  `scripts/`, `evals/`, `e2e/`, `test/setup.ts`, `.github/`, `.vscode/`, `.cursor/`, `.codex/`, `.gemini/`,
  `bunfig.toml`, `.npmrc`, `.claude/` (everything in it), `.agents/`, `CLAUDE.md`, `GEMINI.md`, `.cursorignore`,
  `.geminiignore`, `.fingerprintignore`, `.githooks/`, `.husky/`, lefthook config and `.mcp.json`. Path checks ignore case.
- `lint-changed` lints each file after you edit it.
- `.claude/settings.json` also denies Read of credential files and asks before `git push`, `gh pr merge` and production-affecting EAS commands.

The hooks are guardrails against mistakes and prompt injection, not a sandbox. If a hook blocks a command, do not work
around it: report the command and the message.

## MCP servers (`.mcp.json`)

- `e2e` (tester-army/e2e) drives the emulator/simulator with no model key: open a session, observe, tap, type, then
  encode the journey as a test in `e2e/`. Pinned via the devDependency, telemetry off. On Windows it needs WSL2.
- `expo` is Expo's hosted docs and EAS MCP server (needs an Expo login).
- Other tools use mirrors: `.cursor/mcp.json`, `.vscode/mcp.json`, `.gemini/settings.json`, `.codex/config.toml`.
  `docs:check` fails if their server lists drift.

## Agents and skills

Slash-invoked skills: `/new-feature` (one feature end to end: spec, plan, code, tests, review, device check),
`/verify` (run every check), `/ship` (take finished work to a PR with two approval stops). Full skill list: `AGENTS.md`.

Subagents (`.claude/agents/`), dispatch when:

| Agent | When |
|---|---|
| `rn-reviewer` | before every commit/PR: give it the base branch, intent, and any agreed constraints |
| `mobile-security-auditor` | change touches auth, tokens, storage, deep links, env, network, permissions |
| `a11y-auditor` | UI changes: roles, labels, headings, contrast, touch targets, reduce motion, screen sizes (no source edits) |
| `perf-auditor` | slow screens/lists, bundle growth, new dependencies, before a release (no source edits, measured) |
| `app-tester` | after UI/navigation changes: drives the device over the `e2e` MCP, then writes the e2e test |
| `docs-keeper` | after changing scripts, `.claude/`, layout, env vars or the stack: fixes doc drift |
| `sdk-upgrader` | moving to a newer Expo SDK; never builds production, publishes, or pushes |

Kit checks: `bun run lint:claude` (skill/agent frontmatter, free), `bun run docs:check` (docs match the repo),
`bun run skills:check` (`.agents/skills` matches `.claude/skills`); all three are part of `verify`.
`bun run evals:skills` is opt-in and paid (`evals/README.md`); never in the pre-commit hook.
Production builds, store submits, production OTA publishes and rollbacks always need explicit approval in the session.

## Git

Run `rn-reviewer` before opening a PR. Commit and branch rules are in `AGENTS.md`.
