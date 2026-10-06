import type { ConfigContext, ExpoConfig } from 'expo/config';

/*
 * One app, three installable variants. APP_ENV is set per EAS build profile (eas.json);
 * locally it defaults to development. Each variant gets its own bundle id and name so
 * dev, preview and production builds can sit side by side on one device.
 */
// Rename the app with `bun scripts/rename.ts --id com.acme.app --name "Acme" --slug acme` (see its header).
const BASE_ID = 'com.example.expoapptemplate';
const BASE_NAME = 'Expo App Template';
// Set after `bun run eas init` prints your project id. Enables EAS Update (OTA).
const EAS_PROJECT_ID = '';

const variants = {
  development: { id: `${BASE_ID}.dev`, name: `${BASE_NAME} (Dev)` },
  preview: { id: `${BASE_ID}.preview`, name: `${BASE_NAME} (Preview)` },
  production: { id: BASE_ID, name: BASE_NAME },
};

type AppEnv = keyof typeof variants;
const isAppEnv = (value: string): value is AppEnv => Object.hasOwn(variants, value);

const APP_ENV = process.env.APP_ENV ?? 'development';
if (!isAppEnv(APP_ENV)) {
  throw new Error(`APP_ENV must be one of ${Object.keys(variants).join(', ')} (got "${APP_ENV}")`);
}
const variant = variants[APP_ENV];

// The JS bundle reads EXPO_PUBLIC_APP_ENV (src/config/env.ts); a mismatch ships the wrong behaviour.
const PUBLIC_APP_ENV = process.env.EXPO_PUBLIC_APP_ENV;
if (PUBLIC_APP_ENV !== undefined && PUBLIC_APP_ENV !== APP_ENV) {
  throw new Error(`EXPO_PUBLIC_APP_ENV ("${PUBLIC_APP_ENV}") must match APP_ENV ("${APP_ENV}").`);
}

// Fail the build, not the app launch: src/config/env.ts throws at startup without this.
if (APP_ENV !== 'development' && !process.env.EXPO_PUBLIC_API_URL) {
  throw new Error(
    `EXPO_PUBLIC_API_URL is not set for the "${APP_ENV}" build. Add it as an EAS environment variable.`,
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  ...(EAS_PROJECT_ID
    ? {
        extra: { eas: { projectId: EAS_PROJECT_ID } },
        updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
      }
    : {}),
  name: variant.name,
  slug: 'expo-app-template',
  version: '1.0.0',
  // Phone-first: portrait only. Android 16 (targetSdk 36) ignores this lock and the resizability opt-out on
  // windows >= 600dp (tablets, foldables, desktop mode), so layouts must also work wider and in landscape.
  // Screen caps content at max-w-xl and applies side insets for that case. To support landscape or tablets,
  // use 'default' here and set ios.supportsTablet below to true, then re-test every screen at tablet widths and in landscape.
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  // Must stay lowercase — uppercase schemes break EAS Update publishing.
  scheme: 'expoapptemplate',
  userInterfaceStyle: 'automatic',
  // Fingerprint ties OTA updates to the exact native build they are compatible with.
  runtimeVersion: { policy: 'fingerprint' },
  ios: {
    bundleIdentifier: variant.id,
    icon: './assets/expo.icon',
    // false: iPad runs the app as a scaled iPhone app. Set true to ship a native iPad layout (windows are then
    // resizable; UIRequiresFullScreen is deprecated), and test every screen at iPad sizes first.
    supportsTablet: false,
    // Export compliance: HTTPS and OS-provided crypto only. Set true if you add custom encryption.
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
    // Required-reason APIs used by dependencies (Apple doesn't merge static pods' manifests).
    // `bun run privacy:check` fails when a newly added native dependency needs more.
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['0A2A.1', '3B52.1', 'C617.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
      ],
    },
  },
  android: {
    package: variant.id,
    adaptiveIcon: {
      backgroundColor: '#ffffff',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        // Matches the background token in src/global.css (light and dark).
        backgroundColor: '#ffffff',
        dark: { backgroundColor: '#09090b' },
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
    '@sentry/react-native',
    [
      'expo-build-properties',
      {
        // R8 minification and resource shrinking for Android release builds (dev builds are unaffected).
        // Verified by the release-mode e2e run; re-run it (E2E_BUILD=release) after adding a native module.
        android: { enableMinifyInReleaseBuilds: true, enableShrinkResourcesInReleaseBuilds: true },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
