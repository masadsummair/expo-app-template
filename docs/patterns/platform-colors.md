# Platform colours: iOS system colours and Material You

Optional pattern. Apply it only when you choose a system look over a brand look.

## Concept

React Native can use colours the operating system resolves at draw time.

- **iOS** system colours (`systemBackground`, `label`, `secondarySystemBackground`, and others) adapt to dark mode, to **Increase Contrast**, and to elevated dark backgrounds (the lighter backgrounds iOS uses for stacked surfaces).
- **Android 12+** dynamic colour (Material You) derives a palette from the user's wallpaper and exposes it as system colour resources.

## Example

```ts
import { DynamicColorIOS, Platform, PlatformColor } from 'react-native';

export const surface = Platform.select({
  ios: PlatformColor('secondarySystemBackground'),
  android: PlatformColor('@android:color/system_neutral1_50'),
  default: '#ffffff',
});

export const accent = DynamicColorIOS({
  light: '#0a6cff',
  dark: '#4d9bff',
  highContrastLight: '#004bb5',
  highContrastDark: '#80b6ff',
});
```

Use them in `style`, not in class names.

## Limitations

- A `PlatformColor` is an opaque object. Class-name styling cannot take it, and a script cannot read its resolved value, so the template's contrast check does not cover it. Check contrast by hand with Increase Contrast on, in both themes.
- Dynamic colour resources exist on Android 12 and newer only; older devices need a fallback colour.
- UNVERIFIED: the exact resource names for each tonal step; read the Android reference for the ones you use.
- A wallpaper-derived palette dilutes brand colour. Decide whether the app is brand-first.
- Mixing system and token colours on one screen is easy to get wrong in dark mode. Pick one source per surface.

## Scope

- Fits: utility apps that should feel native, and users who depend on Increase Contrast.
- Does not fit: brand-led apps, or any screen whose colours must be identical on both platforms.
