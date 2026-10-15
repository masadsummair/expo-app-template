# Release and maintenance

## Release and ops

| Need                                                      | Use                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build, submit, OTA update or rollback, version bumps      | the `release` skill. Its fingerprint preflight is a manual check: nothing refuses an OTA update, and one published after a native change reaches no build.                                                                                                                    |
| Add an environment variable with the right EAS visibility | the `env-secrets` skill                                                                                                                                                                                                                                                       |
| Deep links                                                | the `deep-links` skill                                                                                                                                                                                                                                                        |
| Push notifications                                        | the `push-notifications` skill (needs `bunx expo install expo-notifications`, `EAS_PROJECT_ID`, FCM/APNs credentials (APNs needs a paid Apple account, [capabilities](https://developer.apple.com/help/account/reference/supported-capabilities-ios)) and a new native build) |
| Move to a newer Expo SDK                                  | the `sdk-upgrader` agent                                                                                                                                                                                                                                                      |

Run the EAS CLI as `bun run eas <command>`; it's pinned to one version. Production-affecting EAS commands are never
pre-approved: in Claude Code the guard hook asks for each, Codex has no such hook, so ask first. Android release builds are minified with R8: re-run the release e2e
(`E2E_BUILD=release`) after adding a native module.

## Keeping the template current

- **Variant branches:** merge `main` into `supabase` and `firebase` the same day `main` changes, through `sync/main-into-<variant>` PRs. Never merge a variant into `main`. Turn on `git config rerere.enabled true` so a resolved conflict is reused. On a `bun.lock` conflict keep the variant's file and run `bun install`; on `.agents/skills` run `bun run skills:sync`.
- **Expo SDK upgrades:** the `sdk-upgrader` agent (uses the vendored `expo-upgrade` skill), then `bun run doctor`.
- **Vendored skills:** refresh quarterly; the steps are in `.claude/skills/SOURCES.md`.
- **Docs drift:** `bun run docs:check` (also in the pre-commit hook); the `docs-keeper` agent fixes it.
- **Existing apps:** apps created from this template don't get later template changes automatically; port them by hand.
