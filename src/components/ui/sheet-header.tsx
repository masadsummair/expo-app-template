import { router } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';

import { Icon } from './icon';
import { Text } from './text';
import { useRipple } from './tokens';

export type SheetHeaderProps = {
  title: string;
  /** Prefix for testIDs: the close button gets `${testID}-close`. */
  testID: string;
};

/**
 * Title row for Expo Router `formSheet` screens. Native headers are not supported inside an Android
 * form sheet, so sheets render their own title and close button. The close affordance follows the platform:
 * "Done" text on the trailing side on iOS, an X icon on Android. Both keep `${testID}-close`.
 * Register sheets in the parent layout with the options in the `expo-router` skill, e.g.
 * `presentation: 'formSheet', sheetAllowedDetents: [0.45, 1], sheetGrabberVisible: true`. Do not set
 * `sheetCornerRadius` (iOS 26 draws its own) or an opaque background on iOS 26 (see src/lib/platform.ts).
 * New form sheets also set `contentStyle: sheetContentStyle()` so Liquid Glass shows on iOS 26. The sheet
 * screen itself adds no background class: native-stack paints it (transparent on iOS 26).
 */
export function SheetHeader({ title, testID }: SheetHeaderProps) {
  const ripple = useRipple(true);
  const ios = Platform.OS === 'ios';
  return (
    <View className="flex-row items-center justify-between gap-2 pb-2">
      {/* flex-1 + 2 lines: a long title wraps instead of pushing the close button off screen. */}
      <Text variant="heading" className="flex-1" numberOfLines={2}>
        {title}
      </Text>
      <Pressable
        testID={`${testID}-close`}
        accessibilityRole="button"
        accessibilityLabel={ios ? 'Done' : 'Close'}
        hitSlop={12}
        android_ripple={ripple}
        className={cn(
          'min-h-12 min-w-12 items-center justify-center rounded-full',
          ios && 'px-2 active:opacity-pressed',
        )}
        onPress={() => router.back()}
      >
        {ios ? (
          <Text className="font-semibold text-primary">Done</Text>
        ) : (
          <Icon name={{ ios: 'xmark', android: 'close' }} size={20} colorClassName="accent-muted" />
        )}
      </Pressable>
    </View>
  );
}
