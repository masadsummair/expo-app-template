import '@/global.css';
// Side effects: TanStack Query follows network state (expo-network) and app focus (AppState).
import '@/lib/query-setup';

import * as Sentry from '@sentry/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { type ColorValue, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Toaster } from 'sonner-native';
import { useCSSVariable } from 'uniwind';

import { env } from '@/config/env';
import { useUpdateCheck } from '@/hooks/use-update-check';
import { initCrashReporting } from '@/lib/crash-reporting';
import { preloadIconFont } from '@/lib/icon-font';
import { queryClient } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth-store';
import { applyStoredTheme } from '@/stores/theme-store';

initCrashReporting();
SplashScreen.preventAutoHideAsync();
// Apply the saved light/dark/system choice before the first frame (MMKV is synchronous).
applyStoredTheme();

function RootLayout() {
  const colorScheme = useColorScheme();
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const { updateReady, reload } = useUpdateCheck();
  const [iconsReady, setIconsReady] = useState(false);
  const [background, surface, foreground, divider, primary, danger] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-foreground',
    '--color-divider',
    '--color-primary',
    '--color-danger',
  ]);
  // Native headers and screen backgrounds take their colours from the same tokens as the app.
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const color = (value: string | number | undefined, fallback: ColorValue) =>
    typeof value === 'string' ? value : fallback;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: color(background, baseTheme.colors.background),
      card: color(colorScheme === 'dark' ? surface : background, baseTheme.colors.card),
      text: color(foreground, baseTheme.colors.text),
      border: color(divider, baseTheme.colors.border),
      primary: color(primary, baseTheme.colors.primary),
      notification: color(danger, baseTheme.colors.notification),
    },
  };

  useEffect(() => {
    void hydrate();
    // Android icons are font glyphs: load the font behind the splash so no icon renders empty.
    void preloadIconFont().finally(() => setIconsReady(true));
  }, [hydrate]);

  // The root view colour shows during screen transitions and keyboard animations: match the theme.
  useEffect(() => {
    if (typeof background === 'string') void SystemUI.setBackgroundColorAsync(background);
  }, [background]);

  const ready = status !== 'loading' && iconsReady;

  // Hide the splash only once the navigator has rendered, so there is no blank frame.
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // An OTA update was downloaded: offer a restart instead of reloading under the user.
  useEffect(() => {
    if (updateReady) {
      toast.info('Update ready', {
        description: 'Restart to get the latest version.',
        action: { label: 'Restart', onPress: () => void reload() },
      });
    }
  }, [updateReady, reload]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <ThemeProvider value={navTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={status === 'signed-in'}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected guard={status === 'signed-out'}>
                <Stack.Screen name="sign-in" />
              </Stack.Protected>
            </Stack>
            <Toaster position="top-center" theme={colorScheme === 'dark' ? 'dark' : 'light'} />
            <StatusBar style="auto" />
          </ThemeProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

// Wrap only when Sentry was initialised — wrapping without init logs a warning on every launch.
export default env.SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;

/** Expo Router renders this when any route below throws during render. */
export { ErrorFallback as ErrorBoundary } from '@/components/error-fallback';
