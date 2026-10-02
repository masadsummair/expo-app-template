---
name: e2e-flow
description: Write or fix a Maestro end-to-end flow, and drive the simulator with agent-device to explore a screen first. Use when asked for an e2e test, a user-flow test, a smoke test, or to "click through" the app.
---

# E2E flows (Maestro) and simulator driving (agent-device)

Two tools, two jobs:
- **agent-device** (MCP) — interactive: explore the running app, find testIDs, reproduce a bug, verify a change.
- **Maestro** (`.maestro/`) — repeatable: committed YAML flows that run locally and on EAS Workflows.

Explore with agent-device first, then encode what you learned as a Maestro flow.

## Layout

```
.maestro/
  config.yaml              # which flows run by default
  shared/_on-flow-start.yaml  # launch + reset + dev-client handling
  shared/_sign-in.yaml     # reusable steps (underscore = not a standalone flow)
  flows/<feature>.yaml     # one user journey per file, tagged
```

## Flow template

```yaml
# Signs in and lands on the home screen.
appId: ${MAESTRO_APP_ID}
tags: [smoke]
onFlowStart:
  - runFlow: ../shared/_on-flow-start.yaml
---
- runFlow: ../shared/_sign-in.yaml
- extendedWaitUntil:
    visible:
      id: home-screen
    timeout: 10000
- assertVisible:
    id: home-sign-out
```

## Rules

1. **Select by `id:` (testID) only.** Never by visible text or `accessibilityLabel` — text changes, and
   React Native can emit duplicate label nodes. If an element has no testID, add one in the component.
2. testIDs are unique on a screen and kebab-case: `<screen>-<element>`.
3. **No `sleep`.** Use `extendedWaitUntil` or `waitForAnimationToEnd` — taps inside animating sheets and
   modals miss otherwise.
4. Every flow starts from `_on-flow-start.yaml`, reads `${MAESTRO_APP_ID}`, and has a tag. Flows are
   independent — never rely on state from another flow.
5. **No real credentials in YAML.** Use `${MAESTRO_TEST_EMAIL}` / `${MAESTRO_TEST_PASSWORD}` passed with `-e` locally or from
   EAS secrets in CI, for a dedicated seeded test account.
6. Keep `inputText` values short — long strings drop characters.
7. If you add the Maestro MCP server (`maestro mcp`), its `run` tool executes agent-written YAML on the device: use it only against a simulator, never with real accounts. It is not configured in `.mcp.json` by default.

## Running

```bash
# local: needs a running dev build and the Maestro CLI (brew install maestro)
MAESTRO_APP_ID=com.example.expoapptemplate.dev maestro test .maestro/flows -e MAESTRO_TEST_EMAIL=... -e MAESTRO_TEST_PASSWORD=...
```

CI runs flows tagged `smoke` on EAS Workflows (`.eas/workflows/e2e-*.yml`) against an `e2e-test` release
simulator build — no dev launcher there.

## agent-device quick reference

Prefer tree snapshots over screenshots (fewer tokens). Select with `id=<testID>`.
Known issue on iOS 27 + Expo SDK 57: elements directly above the native tab bar can be reported as occluded
(callstack/agent-device#2996) — fall back to a coordinate press for those.
