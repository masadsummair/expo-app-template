# Vendored skills

Third-party skills copied into this template at a pinned commit. Licenses are in `THIRD_PARTY/` (plus
`expo-animation/LICENSE`, which ships with the upstream skill); see `THIRD_PARTY_NOTICES.md`.
Everything not listed here (`new-screen`, `new-component`, `api-endpoint`, `e2e-flow`, `new-feature`,
`add-form`, `add-store`, `release`, `env-secrets`, `deep-links`, `push-notifications`, `verify`, `ship`)
is authored for this template.

Referenced, not vendored: `e2e` (tester-army/e2e) 0.17.0 and `@e2e-dev/mobile` 0.9.2 (Apache-2.0) are pinned
devDependencies; the `e2e-flow` skill points at their version-locked docs inside `node_modules/e2e`. Nothing is copied.

Why vendored instead of the `expo@claude-plugins-official` plugin: a curated subset costs ~1k tokens
of always-loaded skill descriptions (the full plugin loads 24 skills, ~3.1k), works on a fresh clone
with no install step, is pinned, and carries none of the plugin's telemetry hooks. The plugin is
disabled in `.claude/settings.json` because `create-expo-app` enables it by default.

| Skill | Upstream | Commit | License |
|---|---|---|---|
| expo-router, expo-native-ui, expo-data-fetching, expo-animation, expo-project-structure, eas-app-stores, eas-update, expo-upgrade, expo-dev-client | [expo/skills](https://github.com/expo/skills) `plugins/expo/skills/` | `c0dadf3` (2026-09-28) | MIT |
| react-native-best-practices | [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) `skills/` | `61e6e7d` (2026-09-16) | MIT |
| react-native-testing | [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) `plugins/vendored/.agents/skills/react-native-testing/` (content from callstack/react-native-testing-library) | `61e6e7d` (2026-09-16) | MIT |

`expo-animation` was written with Emil Kowalski and is also published at
[emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT, `expo-animation/LICENSE`). It is vendored
from expo/skills, not from that repo.

Adapted (not a copy):

| Skill | Adapted from | Commit checked | License |
|---|---|---|---|
| debug-rn | [mattpocock/skills](https://github.com/mattpocock/skills) `skills/engineering/diagnosing-bugs` | `6fd9479` (2026-10-06); the upstream skill last changed at `d80fa0f` (2026-08-15). The commit originally adapted was not recorded. | MIT |

Not vendored (upstream skills that the vendored ones mention; references were reworded, see modification 12):
`eas-hosting`, `eas-workflows`, `eas-update-insights`, `expo-brownfield`, `expo-ui`, `expo-skill-feedback`.

## Local modifications

Re-apply these after every refresh.

1. **All 9 Expo skills:** removed the trailing `## Submitting Feedback` section. It instructed the
   agent to run `npx --yes submit-expo-feedback@latest` (unpinned network call) and to load the
   `expo-skill-feedback` telemetry skill, which is not vendored.
2. **expo-native-ui/SKILL.md:** replaced the "check `expo-ui` first" callout with a
   *Template overrides* block (project primitives + Uniwind first, dev build instead of Expo Go,
   SecureStore/MMKV storage). Reworded the `@expo/ui` library-preference bullet to match.
3. **react-native-best-practices/references/js-react-compiler.md:** added a template note — the compiler
   is already enabled via `experiments.reactCompiler`; do not install the beta Babel plugin.
4. **react-native-best-practices/references/js-bottomsheet.md:** added a template note — never downgrade
   to Reanimated 3; prefer Expo Router `formSheet`.
5. **eas-update/SKILL.md `allowed-tools`:** upstream pre-approved `Bash(npx expo *)`, `Bash(npx *eas-cli@*)`
   and `Bash(eas *)` — which would let a loaded skill run `eas update` to production, or any package whose
   name ends in `eas-cli`, without a prompt. Narrowed to read-only `bun run eas` list/whoami commands.
6. **expo-project-structure/SKILL.md:** added a template override. The template's layout is in `AGENTS.md` > Layout;
   the skill must not be applied.
7. **expo-router/SKILL.md, references/tabs.md:** added a template override. Native Stack only, no `NativeTabs` or
   `predictiveBackGestureEnabled` change until SDK 58 (`AGENTS.md` > Platform parity).
8. **expo-native-ui/SKILL.md, references/storage.md, references/controls.md:** override on the "Running the App"
   section (Expo Go first does not apply), override on `storage.md` (use SecureStore / `@/lib/storage`, not the
   `expo-sqlite` `localStorage` polyfill), and the `expo-ui` skill pointer in `controls.md` reworded.
9. **expo-animation/SKILL.md:** added a template override (`AGENTS.md` > Motion wins; no `NativeTabs`; animation
   dependencies already installed).
10. **expo-dev-client/SKILL.md:** added a template override (`bun run ios` / `bun run android`, pinned `eas-cli`,
    macOS-only iOS tooling).
11. **expo-upgrade/SKILL.md:** added a template override (`bunx`, `bun run doctor`, PowerShell cache reset, no
    `watchman`/`pod` on Windows, no AsyncStorage replacement).
12. **eas-app-stores, eas-update:** added a template override (`bun run eas`, no global install, no
    `@latest`, `npx testflight` is macOS-only). Removed references to skills that are not vendored
    (`eas-hosting`, `eas-workflows`, `eas-update-insights`, `expo-brownfield`) from the `description` fields,
    `SKILL.md` and `references/workflows.md`.
13. **react-native-best-practices/SKILL.md:** added a template override (`bunx`, `bunx expo install`, macOS-only
    CocoaPods/Xcode steps).
14. **react-native-best-practices:** removed `references/images/` (6.2 MB), `POWER.md` (Kiro onboarding file, not
    used by Claude Code) and the 10 `![](images/...)` links in `references/`.

## Refreshing (quarterly, or on an Expo SDK upgrade)

Refresh on each Expo SDK release. `$TMP` is any temp dir (`$env:TEMP` in PowerShell):

```bash
git clone https://github.com/expo/skills "$TMP/expo-skills" && git -C "$TMP/expo-skills" checkout <sha>
git clone https://github.com/callstackincubator/agent-skills "$TMP/agent-skills" && git -C "$TMP/agent-skills" checkout <sha>
# copy the skills listed above over the existing folders, diff, re-apply "Local modifications",
# then update the commit column in this file. Diff react-native-testing against agent-skills, not RNTL.
```
