import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OfflineBanner } from '@/components/offline-banner';
import { BottomBannerHeightContext } from '@/components/ui/screen';
import { sheetContentStyle } from '@/lib/platform';

// Declared screens are ordered before undeclared ones, so without this the first declared screen
// (e.g. a sheet) would become the group's initial route instead of Home.
export const unstable_settings = { initialRouteName: 'index' };

export default function AppLayout() {
  const [bannerHeight, setBannerHeight] = useState(0);

  return (
    <View className="flex-1 bg-background">
      <BottomBannerHeightContext value={bannerHeight}>
        <Stack>
          <Stack.Screen name="index" />
          {/* Form sheets: native on both platforms. Keep detents to <= 3 (Android limit) and render a
              SheetHeader inside instead of a native header (unsupported in Android form sheets). Do not set
              a sheet corner radius: iOS 26 draws its own. */}
          <Stack.Screen
            name="about"
            options={{
              presentation: 'formSheet',
              // A second, full-height stop: the first one can be too short on small phones or at large text.
              sheetAllowedDetents: [0.45, 1],
              sheetGrabberVisible: true,
              headerShown: false,
              // Native-stack paints the sheet's Screen view with the theme background; clear it on iOS 26.
              contentStyle: sheetContentStyle(),
            }}
          />
          {/* Development-only component catalogue (Settings > Component catalogue). Unreachable in release. */}
          <Stack.Protected guard={__DEV__}>
            <Stack.Screen name="catalogue" />
          </Stack.Protected>
        </Stack>
      </BottomBannerHeightContext>
      <OfflineBanner onHeightChange={setBannerHeight} />
    </View>
  );
}

// Contain render errors to the signed-in area; the root boundary stays the last resort.
export { ErrorFallback as ErrorBoundary } from '@/components/error-fallback';
