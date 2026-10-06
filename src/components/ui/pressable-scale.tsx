import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import * as haptics from '@/lib/haptics';
import { PRESSED_SCALE, spring } from '@/lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  /** Required: e2e tests and agents select elements by testID. */
  testID: string;
  /** Required: what the whole pressable surface does, read by screen readers. */
  accessibilityLabel: string;
  haptic?: boolean;
};

/**
 * Opt-in press feedback for cards and rows: a subtle UI-thread spring scale, identical on iOS and
 * Android, and skipped automatically when the system "reduce motion" setting is on. Buttons keep
 * the simpler opacity press (see Button). `className` lands on the pressable itself, so padding
 * and min-h are tappable and the scale matches the touch region.
 */
export function PressableScale({
  children,
  className,
  haptic = true,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ scale: scale.get() }] };
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      className={className}
      style={style}
      onPressIn={(event) => {
        scale.set(withSpring(PRESSED_SCALE, spring.snappy));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, spring.snappy));
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic) haptics.tap();
        onPress?.(event);
      }}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
