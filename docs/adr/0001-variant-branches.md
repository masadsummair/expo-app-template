# 0001 · Variant branches

Status: Accepted · 2026-10-13

## Context

The template needs two production-ready auth variants, one on Supabase and one on Firebase. Auth code has to be tested and identical in every app built from a variant. The maintainer is one person.

## Decision

Keep two long-lived branches, `supabase` and `firebase`, cut from `main` once Phase A is merged. `main` carries the seams (the auth interface with the mock adapter, the standards, the checks). Each branch adds only its provider code, config examples, guides and e2e setup.

- `main` merges into a variant through `sync/main-into-<variant>` pull requests, on the same day `main` changes. Nothing flows the other way.
- No direct commits on a variant. Feature work uses a feature branch and a pull request into that variant.
- A fix that both variants need lands on `main` first, even when the bug was found on a variant.
- On a conflict, keep the variant's `bun.lock` and run `bun install`; for `.agents/skills` run `bun run skills:sync`. Neither is merged by hand.
- Optional features that are not auth ship as pattern docs, not as branches. A new provider starts as a pattern doc.

## Consequences

- Every app starts from the branch that matches its backend, with the same clone command and the same table of variants in the README on every branch.
- Same-day sync pull requests and `git config rerere.enabled true` keep the branches from drifting. Drift is the main cost.
- `docs:check` and `lint:claude` fail on missing paths, so `main`'s docs never name variant-only files. `standards/variant.json` tells the checks which branch they run on.

## Alternatives considered

- **Separate repositories per variant:** the shared tooling, skills and standards would have to be copied and kept in step by hand.
- **One branch plus a variant-strip script:** the unused provider's code and dependencies would sit in every app until the script ran, and the script becomes code to maintain and test.
