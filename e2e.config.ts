import { mobile } from '@e2e-dev/mobile';
import type { E2EConfig } from 'e2e';

import { APP_ID, isReleaseBuild } from './e2e/support/build-mode';

// e2e (tester-army/e2e) sends anonymous usage telemetry unless told not to. The package scripts, the
// CI workflow and the e2e entry in .mcp.json set E2E_TELEMETRY_DISABLED=1. If you run `bunx e2e` by
// hand, export it yourself.
//
// Two build modes, one suite:
//   dev (default)  a development build that loads JS from Metro; this config starts Metro, or reuses
//                  the one you already run on :8081.
//   release        E2E_BUILD=release, a release-style build with the bundle embedded. No Metro, no
//                  dev launcher. This is what CI runs (a dev build cannot run in CI).

// Metro for the dev-client build. `reuseExisting` attaches to a Metro you already run (ignored in CI).
// The child process inherits only PATH and HOME plus `env`, so everything it needs goes in `env`.
const devApp = {
  command: {
    executable: 'bunx',
    args: ['expo', 'start', '--dev-client', '--port', '8081'],
    env: { EXPO_NO_TELEMETRY: '1' },
    startupTimeout: 120_000,
    reuseExisting: true,
    log: '.e2e/logs/metro.log',
  },
  readyUrl: 'http://127.0.0.1:8081/status',
};

// iOS dev-client opens the server straight from launch arguments and turns the dev menu off.
// Android's expo-dev-launcher ignores --initialUrl; open-app.ts connects it with device.openLink.
// Verified on an iOS 26.2 simulator with an EAS-built dev client (2026-10-06). Local iOS builds need Xcode >= 26.4.
const iosDevLaunchArguments = [
  '--initialUrl',
  'http://localhost:8081',
  '-EXDevMenuShowsAtLaunch',
  'NO',
  '-EXDevMenuIsOnboardingFinished',
  'YES',
  '-EXDevMenuShowFloatingActionButton',
  'NO',
];

const mode = isReleaseBuild ? 'release' : 'dev';

// Agent steps (agent.act / assert / extract) need a model. The default suite does not, so the agent
// block only exists when ANTHROPIC_API_KEY is set. A Claude *subscription* cannot be used here; an API
// key can (`ai` and `@ai-sdk/anthropic` are devDependencies). The import is dynamic so the
// config still loads, and the deterministic tests still run, with no key.
const agents: { agents?: E2EConfig['agents'] } = process.env.ANTHROPIC_API_KEY
  ? {
      agents: {
        default: {
          model: (await import('@ai-sdk/anthropic')).anthropic(process.env.E2E_MODEL ?? 'claude-sonnet-5-5'),
          system: 'You are a QA agent for a mobile app. Verify every outcome on screen before you finish.',
          context: 'Screens: Sign in (email, password, Sign in button), then Home (Sign out button).',
          maxSteps: 12,
          maxModelCalls: 12,
        },
      },
    }
  : {};

export default {
  tests: ['e2e/**/*.e2e.ts'],
  targets: [
    {
      name: 'android',
      engine: mobile({ platform: 'android' }),
      app: {
        bundleId: APP_ID,
        identity: `${APP_ID}-android-${mode}`,
        ...(isReleaseBuild ? {} : devApp),
      },
    },
    {
      name: 'ios',
      engine: mobile({ platform: 'ios' }),
      app: {
        bundleId: APP_ID,
        identity: `${APP_ID}-ios-${mode}`,
        ...(isReleaseBuild ? {} : { ...devApp, launchArguments: iosDevLaunchArguments }),
      },
    },
  ],
  // `markdown` writes .e2e/summary.md and .e2e/failures/*.md, which the skills and agents read after a red run.
  reporters: ['list', 'markdown'],
  workers: 1,
  ...agents,
} satisfies E2EConfig;
