# 0003 · Supabase account deletion with a SQL function

Status: Accepted · 2026-10-13

## Context

App Store guideline 5.1.1(v) requires in-app account deletion. A Supabase client cannot delete its own user: the admin API needs the service role key, and that key must never ship in a bundle (ADR 0002 forbids server code that would hold it).

## Decision

Ship one SQL migration, `supabase/migrations/<timestamp>_delete_current_user.sql`, that defines `delete_current_user()`:

- `security definer`, so it can delete from `auth.users`;
- `set search_path = ''`, so a hostile schema cannot shadow a function it calls;
- the function deletes only the row for `auth.uid()`;
- `execute` is revoked from `public` and `anon`.

The client deletes an account in three steps: call the RPC, call Google `revokeAccess()`, then sign out locally. `revokeAccess()` is best effort: its failure never stops the local sign-out. On iOS it needs a current user. ADR 0004 (Sign-out) gives the per-platform steps to get one, including discarding the cached token that `signIn()` returns.

## Consequences

- Deletion needs no server, no service key and no extra deploy step beyond running the migration.
- The function is the privileged surface of the variant, so the `mobile-security-auditor` checklist covers the deletion flow and the rules in the migrations.
- Apple token revocation is not covered. The `apple-token-revocation` pattern doc describes the server piece an app must add before App Store submission.

## Alternatives considered

- **An Edge Function using the service role key:** server code, rejected by ADR 0002.
- **Soft-delete flag with a later cleanup job:** the job is server code, and the account would survive until it ran.
