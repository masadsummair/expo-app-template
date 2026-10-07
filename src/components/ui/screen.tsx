import { createContext, use, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

/** Space kept between the keyboard (or the footer above it) and the focused input. */
const KEYBOARD_GAP = 24;
/** Content column: full width on phones, capped at max-w-xl (576dp) and centred on wider screens. */
const COLUMN = 'w-full max-w-xl self-center px-5';

/**
 * Height of a banner pinned below the screens (see OfflineBanner). It owns the bottom safe-area inset
 * while visible, so Screen drops its own and keeps its sticky footer level with the keyboard.
 */
export const BottomBannerHeightContext = createContext(0);

type ScreenProps = {
  children: ReactNode;
  /** `scroll` for forms and long content (keyboard-aware); `fixed` for layouts that fill the screen. */
  preset?: 'fixed' | 'scroll';
  /**
   * Which of top/bottom get a safe-area inset. Omit 'top' under a native header (it already clears the
   * status bar). Left/right insets always apply: they are 0 in portrait and protect landscape cutouts.
   */
  edges?: Extract<Edge, 'top' | 'bottom'>[];
  /**
   * Pinned below the content and lifted above the keyboard: put a form's primary action here so it is
   * always reachable, whatever the screen height or text size.
   */
  footer?: ReactNode;
  className?: string;
  testID?: string;
};

/*
 * Content sits in a column capped at max-w-xl (576dp) and centred: phones (360-440dp) are unaffected, while
 * tablets, unfolded foldables and Android 16 resizable windows (which ignore the portrait lock at >= 600dp)
 * don't stretch fields and buttons edge to edge. The background stays full bleed.
 *
 * Insets are applied as padding on a core View: Uniwind only styles React Native's own components, so a
 * `className` on safe-area-context's SafeAreaView would be silently dropped.
 */
export function Screen({
  children,
  preset = 'fixed',
  edges = ['top', 'bottom'],
  footer,
  className,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const bannerHeight = use(BottomBannerHeightContext);
  const ownInset = edges.includes('bottom') ? insets.bottom : 0;
  const bottomInset = bannerHeight > 0 ? 0 : ownInset;
  const padding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    // With a footer, the footer owns the bottom inset (it moves with the keyboard).
    paddingBottom: footer ? 0 : bottomInset,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <View className="flex-1 bg-background" style={padding} testID={testID}>
      {preset === 'scroll' ? (
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bottomOffset={footerHeight + KEYBOARD_GAP}
          keyboardShouldPersistTaps="handled"
        >
          <View className={cn(COLUMN, 'grow py-6', className)}>
            {children}
          </View>
        </KeyboardAwareScrollView>
      ) : (
        <View className={cn(COLUMN, 'flex-1 py-6', className)}>
          {children}
        </View>
      )}
      {footer ? (
        // Open keyboard: drop the bottom inset (or the banner below the screen), the keyboard covers it.
        <KeyboardStickyView offset={{ closed: 0, opened: bannerHeight > 0 ? bannerHeight : ownInset }}>
          <View
            className={cn(COLUMN, 'bg-background pt-3')}
            style={{ paddingBottom: bottomInset + 12 }}
            onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
          >
            {footer}
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}
