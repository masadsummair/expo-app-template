---
name: ship
description: Take finished work from the working tree to an open pull request — branch check, /verify, reviewer agents, conventional commit, push, gh pr create — pausing for human approval before the commit and before the push. User-invoked with /ship. Not for releasing the app to stores or OTA (use the release skill).
disable-model-invocation: true
argument-hint: "[short description of the change]"
---

# /ship

Each step must pass before the next. Two hard stops need an explicit "yes" from the human in this session —
silence or "continue" is not approval.

1. **Branch.** `git branch --show-current` must not be `main`/`master`. If it is, create
   `<type>/<short-slug>` from the change (`git switch -c feat/profile-edit`).
2. **Verify.** Run the commands in `.claude/skills/verify/SKILL.md` (read the file; `verify` is user-invoked only, so
   do not use the Skill tool) and paste its table. Any ❌ → stop and report.
3. **Review.** Both reviews are required and must have run on the current diff; an edit after a review makes it stale.
   - `slop-reviewer` on the diff;
   - `adversarial-reviewer` with the base branch, the spec path and AC list (if any), and any constraint agreed in
     conversation.
   A report that does not end with `REVIEW-COMPLETE` did not finish: re-run it, at most twice. Also run:
   - `mobile-security-auditor` if auth, tokens, storage, deep links, env, network or permissions changed;
   - `a11y-auditor` if screens or components changed.
   Fix every BLOCKING / BLOCK finding, re-run `bun run verify`, and re-run both reviewers if anything in the diff
   changed. If a report still does not end with `REVIEW-COMPLETE` after two re-runs, or BLOCKING findings remain
   after 3 review rounds, stop and report to the user.
4. **Summarise and STOP (approval 1).** Show `git status --short -uall` and the exact list of paths you will stage. Flag
   untracked files, `.e2e/` output, keystores and credential files (`*.jks`, `*.keystore`, `google-services.json`,
   service-account JSON): none of them are staged. Also show what each reviewer found and what was fixed, and the
   checks that passed. Ask: "Commit these changes?"
5. **Commit.** Conventional message `<type>(<scope>): <description>`, header ≤ 100 characters, body explains why.
   Stage only the paths approved in step 4 (`git add <path>...`), never `git add -A` or `.env*`.
6. **STOP (approval 2).** Ask: "Push the branch and open a pull request?"
7. **Push and PR.** `git push -u origin HEAD`, then `gh pr create` (needs the GitHub CLI: check `gh auth status`; if it
   is missing or not logged in, print the branch name and the PR body for the human instead) with a body that lists: what changed, how it
   was verified (paste the /verify table), reviewer results, and anything not verified (e.g. "iOS not run").

Never push to `main`, force-push, skip hooks (`--no-verify`), or merge the PR. Merging is the human's call.
