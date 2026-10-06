import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from './icon';
import { Text } from './text';

export type SheetHeaderProps = {
  title: string;
  /** Prefix for testIDs: the close button gets `${testID}-close`. */
  testID: string;
};

/**
 * Title row for Expo Router `formSheet` screens. Native headers are not supported inside an Android
 * form sheet, so sheets render their own title and close button (same on both platforms).
 * Register sheets in the parent layout with the options in the `expo-router` skill, e.g.
 * `presentation: 'formSheet', sheetAllowedDetents: [0.45, 1], sheetGrabberVisible: true`.
 */
export function SheetHeader({ title, testID }: SheetHeaderProps) {
  return (
    <View className="flex-row items-center justify-between gap-2 pb-2">
      {/* flex-1 + 2 lines: a long title wraps instead of pushing the close button off screen. */}
      <Text variant="heading" className="flex-1" numberOfLines={2}>
        {title}
      </Text>
      <Pressable
        testID={`${testID}-close`}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={12}
        className="h-12 w-12 items-center justify-center rounded-full active:opacity-60"
        onPress={() => router.back()}
      >
        <Icon name={{ ios: 'xmark', android: 'close' }} size={20} colorClassName="accent-muted" />
      </Pressable>
    </View>
  );
}
