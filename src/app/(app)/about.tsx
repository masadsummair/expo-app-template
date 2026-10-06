import Constants from 'expo-constants';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Divider, ListItem, SheetHeader, Text } from '@/components/ui';

/**
 * Example form sheet (presented from Settings). Registered with sheet options in (app)/_layout.
 * Sheet content always scrolls: a detent is a fraction of the screen, so on short phones or at large
 * text sizes the content can be taller than the sheet.
 */
export default function AboutSheet() {
  const { bottom } = useSafeAreaInsets();
  return (
    <ScrollView testID="about-sheet" className="flex-1 bg-background">
      <View className="w-full max-w-xl gap-4 self-center px-5 pt-4" style={{ paddingBottom: bottom + 16 }}>
        <SheetHeader title="About" testID="about" />
        <Text variant="caption">
          Built from the Expo app template. Replace this sheet with the details of your app.
        </Text>
        <Card className="p-0">
          <ListItem title="Version" subtitle={Constants.expoConfig?.version ?? 'unknown'} />
          <Divider />
          <ListItem
            title="Runtime"
            subtitle={
              Constants.expoConfig?.sdkVersion
                ? `Expo SDK ${Constants.expoConfig.sdkVersion}`
                : 'unknown'
            }
          />
        </Card>
      </View>
    </ScrollView>
  );
}
