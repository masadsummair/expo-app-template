@AGENTS.md

# Claude Code specifics (layered on top of AGENTS.md)

All project rules live in `AGENTS.md`. This file holds only what applies to Claude Code. When a rule here conflicts with a vendored skill in `.claude/skills/`, `AGENTS.md` and this file win.

- If a hook blocks you, report the command and the message. Never work around it. What each hook denies: `docs/ai-kit.md`.
- MCP servers (`.mcp.json`; Codex mirrors them in `.codex/config.toml` and `docs:check` fails if the lists drift):
  - `e2e` (tester-army/e2e) drives the emulator or simulator with no model key: open a session, observe, tap, type, then encode the journey as a test in `e2e/`. On Windows it needs WSL2.
  - `expo` is Expo's hosted docs and EAS server (needs an Expo login).
- Claude-only slash skills: `/new-feature` (one feature end to end: spec, plan, code, tests, review, device check), `/verify` (every check), `/ship` (take finished work to a PR with two approval stops).
- Subagents live in `.claude/agents/`; when to dispatch each is in `docs/ai-kit.md`.
