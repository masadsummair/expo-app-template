---
name: new-feature
description: End-to-end workflow to ship one feature - spec with acceptance criteria, plan, implement, unit and e2e tests, review, device check. User-invoked as /new-feature <description or specs/<slug>.md>. Do NOT use for a one-sentence diff, a bug fix (use debug-rn), or a lone screen or component (use new-screen / new-component).
argument-hint: "[feature description or specs/<slug>.md]"
disable-model-invocation: true
---

# New feature

Feature: $ARGUMENTS

Work the phases in order. Each ends in a check you run and report; do not start the next phase until it
passes. Stop and ask when a step needs a decision the user has not made (data model, new dependency,
scope growth). **Never run `git commit` or `git push`** — hand off at the end.

## 1. Spec

- [ ] If the argument is an existing `specs/<slug>.md`, read it. Otherwise interview the user
      (AskUserQuestion) for: goal, who uses it, screens, data, edge cases, out of scope.
- [ ] Write `specs/<kebab-slug>.md` from `specs/_template.md`. Every acceptance criterion gets an ID
      (`AC-1`...) in Given/When/Then form that a user could observe, plus the testIDs it touches.
- [ ] Show the spec. **Wait for explicit approval** before writing code.

## 2. Plan

- [ ] List the files to create/modify and what is out of scope (3+ files: state it and wait for a yes).
- [ ] Read the code you will touch (`src/app`, `src/components/ui`, `src/services/api`, `src/stores`).
- [ ] Mark the Status line in the spec `in progress`.

## 3. Implement (reuse the project skills, in this order)

| Need | Skill |
|---|---|
| Backend data | `api-endpoint` (zod schema, Query hook, tests) |
| Client state shared across screens | `add-store` (first check it should not be Query or `useState`) |
| User input | `add-form` |
| Route | `new-screen` (all four states, testIDs) |
| Reusable UI | `new-component` |

Rules from `AGENTS.md` apply: semantic tokens, no manual memoisation, no `fetch` outside `client.ts`,
no secrets in `EXPO_PUBLIC_*`, tokens only in SecureStore.

## 4. Tests

- [ ] Unit tests (Jest) for every new service, store and `lib` function. Tests for screens only if they
      hold real logic.
- [ ] One e2e test per acceptance criterion, via the `e2e-flow` skill. Title it `AC-<n>: <criterion>` and tag it
      with the feature slug so `bunx --no-install e2e run --tag <slug>` runs exactly this feature:
      ```ts
      import { expect, test } from './support/open-app';

      test('AC-1: saving a valid name shows the new name', { tags: ['profile-edit'] }, async ({ openApp, signIn, screen }) => {
        await openApp();
        await signIn();
        await screen.getByTestId('profile-edit-name').fill('Ada');
        await screen.getByTestId('profile-edit-submit').tap();
        await expect(screen.getByTestId('profile-name')).toBeVisible();
      });
      ```
- [ ] Coverage check — every AC must appear in a test. It lists each missing one and exits 1, so it must print
      nothing and exit 0:
      ```bash
      bun run specs:check <slug>
      ```
      It looks for the title prefix `AC-<n>:` anywhere under `e2e/`.

## 5. Verify

- [ ] `bun run verify` (the `verify` script in `package.json`: typecheck, lint, Jest, `test:hooks`,
      `lint:claude`, `docs:check`, `skills:check`, `contrast:check`, `privacy:check`). Paste the pass/fail counts. Fix failures before moving on;
      after 3 failed attempts at one failure, stop and report.

## 6. Review (fresh context, as subagents)

Subagents do not see this conversation. Give each a self-contained prompt: spec path, base branch,
the AC list, and "report only correctness gaps or violated requirements, not style".

- [ ] `rn-reviewer` on the diff against the spec. Fix real findings; list rejected ones with a reason.
- [ ] `mobile-security-auditor` **only** if auth, storage, network, deep links or secrets changed.
- [ ] Re-run `bun run verify` if code changed.

## 7. Device check

- [ ] Delegate to `app-tester` with the spec path and AC list. It needs a development build installed, Metro
      running, and a booted emulator or simulator (iOS needs macOS); if not, stop and give the user the command
      instead of building unasked.
- [ ] Run `bunx --no-install e2e run --tag <slug>` (telemetry is already off via `.claude/settings.json`). On failure read `.e2e/summary.md` and
      `.e2e/failures/`, fix, then `bunx --no-install e2e run --last-failed`. Do not open raw traces.
- [ ] Mark each AC `pass` or `fail` in the spec with the test name that proves it; set Status to `done`
      only if all pass.

## 8. Hand off

Report: ACs met (with the test that proves each), what the reviewers found, what you did not verify, and
the commands to commit and open a PR. Do not run them.

## Do not

- Skip the spec approval, or change the spec silently after approval (edit it and say so).
- Put agent-driven e2e steps (`agent.act`/`agent.assert`) in the acceptance path: they need a model
  provider key. Use deterministic `screen`/`expect` steps.
- Expand scope. Anything not in the spec goes in its "Out of scope" or "Follow-ups" list.
