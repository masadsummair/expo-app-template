# 0002 · Server-free template

Status: Accepted · 2026-10-13

## Context

Both variants need work that normally runs on a server: deleting a user and revoking Apple tokens. A template that ships Supabase Edge Functions or Firebase Cloud Functions forces every app onto one deployment story and puts privileged keys next to app code.

## Decision

The template ships no server code. That means no Edge Functions, no Cloud Functions and no backend service of any kind. The rule is `core.no-server-code`.

Where a variant needs server-side power, it uses what the provider already runs:

- Supabase deletes a user with a SQL function, `delete_current_user()` (ADR 0003).
- Firebase deletes a user on the client after re-authentication, and revokes Apple tokens with the client SDK.
- Anything that needs a server-held key, such as Apple token revocation on Supabase, is a pattern doc, `apple-token-revocation`, that the app adopts on its own.

## Consequences

- No privileged key (service role, `.p8`, admin SDK credential) ever appears in the template or in an app's JS bundle.
- The Supabase variant cannot revoke Apple tokens by itself. Apple says apps "should" revoke on account deletion ([Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/); TN3194 gives a manual fallback when no token is held), so `docs/auth/apple-setup.md` points to the pattern doc before store submission as expected, not a documented hard gate.
- Apps that need a server add it themselves, outside the template.

## Alternatives considered

- **Ship one reference Edge or Cloud Function per variant:** it would be the only server code in the repo, would need its own tests and deploy tooling, and would tie the template to one hosting layout.
