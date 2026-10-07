# Release and maintenance

## Release and ops

| Need | Use |
|---|---|
| Build, submit, OTA update or rollback, version bumps | the `release` skill. Its fingerprint gate refuses an OTA update when native code changed. |
| Add an environment variable with the right EAS visibility | the `env-secrets` skill |
| Deep links | the `deep-links` skill |
| Push notifications | the `push-notifications` skill (needs `bunx expo install expo-notifications`, `EAS_PROJECT_ID`, FCM/APNs credentials and a new native build) |
| Move to a newer Expo SDK | the `sdk-upgrader` agent |

Run the EAS CLI as `bun run eas <command>`; it's pinned to one version. Production-affecting EAS commands are never
pre-approved and always prompt. Android release builds are minified with R8: re-run the release e2e
(`E2E_BUILD=release`) after adding a native module.

## Keeping the template current

- **Expo SDK upgrades:** the `sdk-upgrader` agent (uses the vendored `expo-upgrade` skill), then `bun run doctor`.
- **Vendored skills:** refresh quarterly; the steps are in `.claude/skills/SOURCES.md`.
- **Docs drift:** `bun run docs:check` (also in the pre-commit hook); the `docs-keeper` agent fixes it.
- **Existing apps:** apps created from this template don't get later template changes automatically; port them by hand.
- **CODEOWNERS** (`.github/CODEOWNERS`) is fully commented out: replace the placeholder owner, uncomment it and enable
  "Require review from Code Owners" in branch protection.
