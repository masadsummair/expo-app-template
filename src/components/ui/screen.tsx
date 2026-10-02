import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

type ScreenProps = {
  children: ReactNode;
  /** `scroll` for forms and long content (keyboard-aware); `fixed` for layouts that fill the screen. */
  preset?: 'fixed' | 'scroll';
  edges?: Edge[];
  className?: string;
  testID?: string;
};

// Insets are applied as padding on a core View: Uniwind only styles React Native's own
// components, so a `className` on safe-area-context's SafeAreaView would be silently dropped.
export function Screen({
  children,
  preset = 'fixed',
  edges = ['top', 'bottom'],
  className,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View className="flex-1 bg-background" style={padding} testID={testID}>
      {preset === 'scroll' ? (
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className={cn('grow px-5 py-6', className)}>{children}</View>
        </KeyboardAwareScrollView>
      ) : (
        <View className={cn('flex-1 px-5 py-6', className)}>{children}</View>
      )}
    </View>
  );
}
