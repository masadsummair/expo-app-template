import { Platform, useColorScheme } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { useCSSVariable } from 'uniwind';

/** Space between the toast and the edge it sits against (nav bar or keyboard on Android). */
const EDGE_GAP = 16;

const asColor = (value: string | number | undefined) =>
  typeof value === 'string' ? value : undefined;

/**
 * The app's one <Toaster />. iOS: top, with a close button; sonner-native renders it in a full-window overlay,
 * so it stays above native form sheets and is placed by the system safe area. Android: bottom with no close
 * button, lifted above the navigation bar or the open keyboard. Android root toasts can still render behind a
 * native form sheet: show errors inline there. Colours come from the theme tokens.
 */
export function AppToaster() {
  const scheme = useColorScheme();
  const { bottom } = useSafeAreaInsets();
  const keyboardHeight = useKeyboardState((state) => (state.isVisible ? state.height : 0));
  const surface = asColor(useCSSVariable('--color-surface'));
  const divider = asColor(useCSSVariable('--color-divider'));
  const foreground = asColor(useCSSVariable('--color-foreground'));
  const muted = asColor(useCSSVariable('--color-muted'));
  const primary = asColor(useCSSVariable('--color-primary'));
  const primaryForeground = asColor(useCSSVariable('--color-primary-foreground'));

  const ios = Platform.OS === 'ios';
  // sonner-native's `offset` replaces its own safe-area offset, so the nav bar inset is added here.
  const offset = ios ? undefined : (keyboardHeight > 0 ? keyboardHeight : bottom) + EDGE_GAP;

  return (
    <Toaster
      position={ios ? 'top-center' : 'bottom-center'}
      offset={offset}
      closeButton={ios}
      theme={scheme === 'dark' ? 'dark' : 'light'}
      maxFontSizeMultiplier={1.5}
      toastOptions={{
        style: { backgroundColor: surface, borderColor: divider },
        titleStyle: { color: foreground },
        descriptionStyle: { color: muted },
        actionButtonStyle: { backgroundColor: primary },
        actionButtonTextStyle: { color: primaryForeground },
      }}
    />
  );
}
