/** Shared by e2e.config.ts and the open-app fixture, so the two cannot disagree about the build under test. */

/** `release` is a release-style build with the JS bundle embedded (CI). Anything else is a development build. */
export const isReleaseBuild = process.env.E2E_BUILD === 'release';

/** Development builds use the `.dev` application id (see app.config.ts). Override for a preview or production build. `bun scripts/rename.ts` updates the default. */
export const APP_ID = process.env.E2E_APP_ID ?? 'com.example.expoapptemplate.dev';

/** Metro as the device sees it. Android reaches the host through `adb reverse tcp:8081 tcp:8081`. */
export const DEV_SERVER_URL = 'http://127.0.0.1:8081';

/** URL scheme registered by expo-dev-client for this app (`exp+<slug>`). Changes with `slug` in app.config.ts (`bun scripts/rename.ts` updates both). */
export const DEV_CLIENT_SCHEME = 'exp+expo-app-template';
