# <Feature name>

**Slug:** `<kebab-slug>` (also the e2e tag)
**Status:** draft | approved | in progress | done

## Goal

One or two sentences: what the user can do afterwards that they could not before.

## Out of scope

- Things a reviewer might expect but that this feature deliberately does not do.

## Screens / routes

| Route | New or changed | Purpose |
|---|---|---|
| `src/app/(app)/<name>.tsx` | new | ... |

## Data

- Endpoints: `METHOD /path` — request and response zod schema (`src/services/api/<resource>.ts`).
- Client state: store name and fields, persisted or not (see `add-store`). "None" is a valid answer.

## Acceptance criteria

Each row is observable by a user and gets exactly one e2e test named `AC-<n>: <criterion>`.

| ID | Given / When / Then | testIDs | Test | Result |
|---|---|---|---|---|
| AC-1 | Given ..., when ..., then ... | `<screen>-<element>` | `e2e/<slug>.e2e.ts` | not run |

## Test plan

- Unit (Jest): which services, stores and lib functions, and the cases that matter (success, schema
  mismatch, error status, migration).
- E2E: the criteria above. Note any state the tests need (credentials, seeded data).

## Follow-ups

Ideas that came up and were left out on purpose.
