import '@/global.css';

import * as Sentry from '@sentry/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { Button, Text } from '@/components/ui';
import { initCrashReporting, reportError } from '@/lib/crash-reporting';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';

initCrashReporting();
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const colorScheme = useColorScheme();
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Hide the splash only once the navigator has rendered, so there is no blank frame.
  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;

  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={status === 'signed-in'}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={status === 'signed-out'}>
              <Stack.Screen name="sign-in" />
            </Stack.Protected>
          </Stack>
        </ThemeProvider>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);

/** Expo Router renders this when any route below throws during render. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Text variant="heading">Something went wrong</Text>
      <Text variant="caption" className="text-center">
        {__DEV__ ? error.message : 'Please try again.'}
      </Text>
      <Button label="Try again" testID="error-retry" onPress={retry} />
    </View>
  );
}
