# Testing and checks

## Checks before every commit

There's no CI/CD on GitHub: checks run on your machine.

- **Pre-commit hook:** `.githooks/pre-commit` runs `bun run verify` and blocks the commit if anything fails. `verify`
  covers typecheck, lint, unit tests, hook tests, `lint:claude`, `docs:check`, `skills:check`, `contrast:check` and
  `privacy:check`.
- **Turning it on:** `bun install` does it (the `prepare` script sets `git config core.hooksPath .githooks`). Skip it
  once, deliberately, with `git commit --no-verify`.
- **Before a release or a big UI change:** also run `bun run doctor` and the e2e suite on a device. They need a booted
  emulator or simulator, so the hook doesn't run them.
- **Want CI/CD?** That's your app's call. Ready-made GitHub Actions (checks on Linux, Windows and macOS, Android e2e on
  an emulator, Dependabot) are in `examples/github-actions/`: copy them into `.github/` (see its README).

Other checks you can run on their own:

| Command | What it does |
|---|---|
| `bun run doctor` | `expo-doctor` dependency and config checks |
| `bun run contrast:check` | fails when a colour token pair drops below WCAG AA in either theme |
| `bun run privacy:check` | fails when a dependency needs an iOS privacy-manifest reason missing from `app.config.ts` |
| `bun run specs:check <slug>` | fails when an acceptance criterion in `specs/<slug>.md` has no e2e test |

## E2E tests (tester-army/e2e)

Tests live in `e2e/*.e2e.ts` (Playwright-style: `screen.getByTestId(...)`, `expect(...)`); config in `e2e.config.ts`.

| Command | What it does |
|---|---|
| `bun run test:e2e:android` | runs on the Android emulator against the dev build (forwards Metro's port with `adb reverse` first) |
| `bun run test:e2e:ios` | runs on the iOS simulator (macOS only) |
| `bun run test:e2e` / `test:e2e:list` | all e2e targets / list the tests a run would select |

- **Agents explore, then encode.** The `e2e` MCP server lets an agent drive the emulator/simulator (observe, tap, type)
  with no model key, then write the journey as a deterministic test. It's the mobile equivalent of Claude in Chrome.
- **Dev vs release builds.** Locally the tests run against your dev build, connected to Metro through the dev-client
  deep link. `E2E_BUILD=release` runs them against a release-style build with no dev launcher.
- **Telemetry is off** (`E2E_TELEMETRY_DISABLED=1` in scripts, MCP configs and Claude settings).
- **Risk:** e2e is pre-1.0 (Apache-2.0) and pinned exactly. The suite passes on an Android emulator and an iOS 26.2
  simulator. Known upstream issues: [#872](https://github.com/tester-army/e2e/issues/872) (iOS 27 `secureTextEntry`
  fill), [#830](https://github.com/tester-army/e2e/issues/830), [#841](https://github.com/tester-army/e2e/issues/841),
  [#797](https://github.com/tester-army/e2e/issues/797).

## AI steps

`agent.act(...)` and `agent.assert(...)` need a model. They're opt-in: set `E2E_AGENT=1` (or `E2E_MODEL_PROVIDER`);
otherwise they're skipped, even with a key or login present, and the rest of the suite still runs. Use a subscription
you already pay for, or an API key:

| Model source | Set up | Starting model (example id) |
|---|---|---|
| ChatGPT Plus or Pro | `bunx --no-install e2e login openai` | `gpt-6-luna` |
| GitHub Copilot (includes Claude models) | `bunx --no-install e2e login github-copilot` | `claude-sonnet-5` |
| OpenCode Console (Zen / Go) | `bunx --no-install e2e login opencode-console` | `deepseek-v4.1-flash` |
| SuperGrok or X Premium+ | `bunx --no-install e2e login spacexai` | `grok-4` |
| Anthropic API key | export `ANTHROPIC_API_KEY` | `claude-sonnet-5-5` |

- **Which model is used:** `E2E_MODEL_PROVIDER` (`anthropic`, `chatgpt`, `copilot`, `opencode`, `grok`) when set, else
  an API key (`ANTHROPIC_API_KEY`, then `OPENCODE_API_KEY`), else your one stored login. With several logins, set
  `E2E_MODEL_PROVIDER`.
- **Model ids:** the starting ids are examples from the e2e docs. Run `bunx --no-install e2e models` to list the ids your
  plan serves, and set one with `E2E_MODEL`; it applies to whichever provider is selected.
- **Limits:** subscriptions use your plan's limits. Claude subscriptions aren't supported upstream: use an API key, or
  Claude models through Copilot.

The logic is in `e2e/support/model.ts`.
