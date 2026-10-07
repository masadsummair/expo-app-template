# Specs

One file per feature: `specs/<kebab-slug>.md`, written from `_template.md` by `/new-feature` (or by hand).
The spec is the contract between you and the coding agent: it names the files and screens involved, what is
out of scope, and the acceptance criteria that tests must prove.

- Acceptance criteria have stable IDs (`AC-1`...). The matching e2e test is titled `AC-1: <criterion>` and
  tagged with the feature slug, so `bunx --no-install e2e run --tag <slug>` runs exactly that feature.
- `bun run specs:check <slug>` fails when a criterion has no e2e test titled `AC-<n>:` under `e2e/`.
- Keep the spec current: update `Status` and the criteria table when the plan changes. A stale spec
  misleads the next session.
- `_template.md` is the shape to copy for a new spec.

Start a feature with `/new-feature <description>` in Claude Code. In other tools, ask the agent to read
`.claude/skills/new-feature/SKILL.md` and follow it. Specs for finished features can stay as history or be
deleted; they are not read at runtime.
