import type { ConfigContext, ExpoConfig } from 'expo/config';

/*
 * One app, three installable variants. APP_ENV is set per EAS build profile (eas.json);
 * locally it defaults to development. Each variant gets its own bundle id and name so
 * dev, preview and production builds can sit side by side on one device.
 */
const BASE_ID = 'com.example.expoapptemplate';
const BASE_NAME = 'Expo App Template';
// Set after `bunx eas-cli init` prints your project id. Enables EAS Update (OTA).
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
    supportsTablet: false,
  },
  android: {
    package: variant.id,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
    '@sentry/react-native',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
