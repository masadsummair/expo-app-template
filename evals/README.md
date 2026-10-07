# Skill and agent evals

Two checks for the `.claude/` kit. One is free and runs in the pre-commit hook. The other calls a model and is opt-in.

| Check | Command | Needs | Cost | When |
|---|---|---|---|---|
| Structural lint | `bun run lint:claude` | nothing | free | every commit (pre-commit hook), after editing any skill or agent |
| Lint self-test | `bun evals/lint-selftest.ts` | nothing | free | after editing `scripts/lint-claude.ts` |
| Trigger evals | `bun run evals:skills` | `claude` CLI, logged in | about $0.05-0.10 per run | after editing a skill description, before a release, after a Claude Code upgrade |

Never put the trigger evals in `bun run verify` or run them on every PR. They are non-deterministic and cost money.

macOS and Linux are supported. Windows is untested: use Git Bash or WSL (the project hooks are TypeScript on bun and run in print mode too). The runner warns when `ANTHROPIC_API_KEY` is set, because calls then bill that key instead of your Claude login.

## Structural lint (`scripts/lint-claude.ts`)

Catches what `claude plugin validate .claude` misses (it only checks YAML syntax and field types).

Skills (`.claude/skills/*/SKILL.md`): frontmatter parses, `name` equals the folder and is lowercase-hyphen,
`description` present and at most 1,536 chars (warns above 1,024), at most 500 lines, no unknown frontmatter keys,
relative links resolve. Skills authored for this template must also say "Use when ..." in the description (error) and say
when not to use them (warning). Skills listed in `.claude/skills/SOURCES.md` are vendored: only the hard limits apply
and broken links are warnings. Never edit them to satisfy the lint; add an entry to `VENDORED_ALLOWLIST` with a comment.

Agents (`.claude/agents/*.md`): frontmatter parses, `name` matches the file, `tools` are real tool names and every
`mcp__<server>` exists in `.mcp.json`, `model`, `color` and `permissionMode` are valid, `skills:` exist, and reviewer or
auditor agents have no `Edit` or `Write`.

Also: `AGENTS.md`, `CLAUDE.md` and `README.md` may only reference `.claude/skills|agents/<name>` that exist, `.claude/`
files must not mention Maestro once `.maestro/` and the `test:e2e` script are gone, and descriptions of own skills that
overlap (Jaccard above 0.6) are flagged because overlap causes misrouting.

Exit code is 1 on any error. Warnings never fail the run.

## Trigger evals (`evals/run-skill-evals.ts`)

Checks that Claude picks the right skill for a request and stays quiet for unrelated ones.

```bash
bun run evals:skills                              # all cases, 3 runs each, sonnet
bun run evals:skills -- --only new-screen --runs 1
bun run evals:skills -- --model haiku --runs 1    # cheap smoke check, too noisy to gate on
```

Flags: `--model`, `--runs`, `--concurrency` (default 4), `--only <skill>`, `--max-budget-usd` (per call, default 0.50),
`--timeout-ms`.

How it works: each prompt runs `claude -p` with `--tools Skill,Read --max-turns 2 --setting-sources project
--strict-mcp-config --no-session-persistence --output-format stream-json --verbose`. Project settings only means your
personal skills, plugins and MCP servers do not change the result. The runner reads the stream, records the first
top-level `Skill` tool call, and kills the process there, so no skill body runs and nothing in the repo changes. It
ignores the exit code because `--max-turns` ends the process with code 1 even on success.

Scoring (3 runs): a positive case passes when the expected skill fires in at least 2 of 3 runs. A negative case passes
when no project skill fires in more than 1 of 3 runs. Built-in skills such as `debug` or `run` are real competitors
and show up in the table; they are not counted as project skills.

Cases live in `evals/skill-triggers.json`: `{ id, prompt, expect: { skill } | { none: true }, near_miss? }`.
Cases for skills that do not exist, and for user-invoked skills (`disable-model-invocation`, such as `new-feature`), are
skipped. Write prompts the way a user types them and never name the skill. Add a `near_miss` case for each pair of
sibling skills. Do not tune a description until every case passes: keep about 40% of the prompts unseen while editing,
and only then re-run them.

Reports go to `evals/results/<timestamp>.json` (gitignored) with the Claude Code version, because behavior shifts
between releases. Tested on Claude Code 2.1.290. Run it from a clean checkout and only on code you trust: print mode
runs project hooks without a trust prompt.

### Limits

- Agent routing (`rn-reviewer`, `mobile-security-auditor`, `app-tester`) is not evaluated. Delegation is flakier than skill
  routing and a probe cost about $0.30 per subagent that ran to completion.
- Haiku gave three different skills for one prompt in three runs. Gate on sonnet only.
- Cost is undercounted: positive runs are killed before Claude reports a total.

### Upgrade path

If you ever package the kit as a real plugin, `claude plugin eval` gives a no-plugin baseline and free
`tool_used: Skill` graders. It cannot see plain `.claude/skills/`, so it does not fit this template today. The
`skill-creator` plugin is a good authoring aid for tuning one description, but its validator rejects Claude Code
fields and the vendored skills' `version` key, so do not use it as the lint.
