# Edit profile (example)

> Illustration only: the files and the `pass` results below are not real. Do not copy the Status or Result values.

**Slug:** `profile-edit`
**Status:** done

## Goal

A signed-in user can change their display name and email from a profile screen, and sees why a save failed.

## Out of scope

- Avatar upload, password change, email verification.

## Screens / routes

| Route | New or changed | Purpose |
|---|---|---|
| `src/app/(app)/profile-edit.tsx` | new | Form with name and email, built with `add-form` |

## Data

- `PATCH /me` — body `{ name, email }`, response `UserSchema` in `src/services/api/<resource>.ts`; invalidates `userKeys.all`.
- Client state: none (server data stays in TanStack Query).

## Acceptance criteria

| ID | Given / When / Then | testIDs | Test | Result |
|---|---|---|---|---|
| AC-1 | Given the form is empty, when the user taps Save, then both fields show an error and nothing is sent | `profile-edit-submit`, `profile-edit-name-error`, `profile-edit-email-error` | `e2e/profile-edit.e2e.ts` | pass |
| AC-2 | Given valid values, when the user taps Save, then the screen closes and the new name shows on the profile | `profile-edit-name`, `profile-edit-email`, `profile-edit-submit` | `e2e/profile-edit.e2e.ts` | pass |
| AC-3 | Given the API rejects the email, when the user taps Save, then the email field shows "That email is taken" and keeps focus | `profile-edit-email-error` | `e2e/profile-edit.e2e.ts` | pass |

## Test plan

- Unit: `user.test.ts` covers success, `bad-data` on a malformed response, and a 422 mapped to `rejected`.
  Schema test for the form rejects a malformed email.
- E2E: AC-1..AC-3, titled `AC-<n>: ...` and tagged `profile-edit`; run with `bunx --no-install e2e run --tag profile-edit`.

## Follow-ups

- Show a success toast instead of just closing the screen.
