import { Stack } from 'expo-router';
import { View } from 'react-native';

import { OfflineBanner } from '@/components/offline-banner';

// Declared screens are ordered before undeclared ones, so without this the first declared screen
// (e.g. a sheet) would become the group's initial route instead of Home.
export const unstable_settings = { initialRouteName: 'index' };

export default function AppLayout() {
  return (
    <View className="flex-1 bg-background">
      <Stack>
        <Stack.Screen name="index" />
        {/* Form sheets: native on both platforms. Keep detents to <= 3 (Android limit) and render a
            SheetHeader inside instead of a native header (unsupported in Android form sheets). */}
        <Stack.Screen
          name="about"
          options={{
            presentation: 'formSheet',
            // A second, full-height stop: the first one can be too short on small phones or at large text.
            sheetAllowedDetents: [0.45, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
            headerShown: false,
          }}
        />
      </Stack>
      <OfflineBanner />
    </View>
  );
}

// Contain render errors to the signed-in area; the root boundary stays the last resort.
export { ErrorFallback as ErrorBoundary } from '@/components/error-fallback';
