# Third-party notices

This template adapts ideas and code from the following MIT-licensed projects.

| Project | What was adapted | License |
|---|---|---|
| [expo/expo](https://github.com/expo/expo) `create-expo-app` default template | Project scaffold, `AGENTS.md` | MIT — full text below |
| [infinitered/ignite](https://github.com/infinitered/ignite) | `ApiProblem` result shape, UI primitive presets, restricted-import lint rules, dev-client test start-up handling (originally a Maestro flow) | MIT — `licenses/ignite-LICENSE` |
| [obytes/react-native-template-obytes](https://github.com/obytes/react-native-template-obytes) | Idea only: zod-validated env and per-environment `app.config.ts` variants | MIT |
| [expo/skills](https://github.com/expo/skills) | Vendored Expo and EAS skills (`expo-*`, `eas-*`) | MIT — `.claude/skills/THIRD_PARTY/expo-skills` |
| [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) | Vendored `react-native-best-practices` skill | MIT — `.claude/skills/THIRD_PARTY/callstack-agent-skills` |
| [callstack/react-native-testing-library](https://github.com/callstack/react-native-testing-library) | Vendored `react-native-testing` skill | MIT — `.claude/skills/THIRD_PARTY/react-native-testing-library` |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `debug-rn` skill adapted from `diagnosing-bugs` | MIT — `.claude/skills/THIRD_PARTY/mattpocock-skills` |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | `expo-animation` skill content (also shipped in expo/skills) | MIT — `.claude/skills/expo-animation/LICENSE` |

Pinned commits and local modifications for vendored skills: `.claude/skills/SOURCES.md`.

License files live in three places: `.claude/skills/THIRD_PARTY/` (skill sources), `.claude/skills/expo-animation/LICENSE` (ships with the upstream skill) and `licenses/` (non-skill code).

## expo/expo `create-expo-app` template notice

The project scaffold and `AGENTS.md` derive from the Expo template. Its original notice:

```text
The MIT License (MIT)

Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

