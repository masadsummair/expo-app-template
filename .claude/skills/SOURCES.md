# Vendored skills

Third-party skills copied into this template at a pinned commit. Licenses are in `THIRD_PARTY/`.
Everything not listed here (`new-screen`, `new-component`, `api-endpoint`, `e2e-flow`, `debug-rn`)
is authored for this template.

Why vendored instead of the `expo@claude-plugins-official` plugin: a curated subset costs ~1k tokens
of always-loaded skill descriptions (the full plugin loads 24 skills, ~3.1k), works on a fresh clone
with no install step, is pinned, and carries none of the plugin's telemetry hooks. The plugin is
disabled in `.claude/settings.json` because `create-expo-app` enables it by default.

| Skill | Upstream | Commit | License |
|---|---|---|---|
| expo-router, expo-native-ui, expo-data-fetching, expo-animation, expo-project-structure, eas-app-stores, eas-update, expo-upgrade, expo-dev-client | [expo/skills](https://github.com/expo/skills) `plugins/expo/skills/` | `c0dadf3` (2026-09-28) | MIT |
| react-native-best-practices | [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) `skills/` | `61e6e7d` (2026-09-16) | MIT |
| react-native-testing | [callstack/react-native-testing-library](https://github.com/callstack/react-native-testing-library), via callstackincubator/agent-skills `plugins/vendored/` | `61e6e7d` (2026-09-16) | MIT |

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
   name ends in `eas-cli`, without a prompt. Narrowed to read-only `bunx eas-cli` list/whoami commands.

## Refreshing (quarterly, or on an Expo SDK upgrade)

```bash
git clone --depth 1 https://github.com/expo/skills /tmp/expo-skills
git clone --depth 1 https://github.com/callstackincubator/agent-skills /tmp/agent-skills
# copy the skills listed above over the existing folders, diff, re-apply "Local modifications",
# then update the commit column in this file.
```
