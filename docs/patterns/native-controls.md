# Native controls with Expo UI

Optional pattern. Apply it only when a platform control is clearly better than a custom one.

## Concept

`@expo/ui` renders SwiftUI views on iOS and Jetpack Compose views on Android inside a host view. It gives real native pickers, menus, bottom sheets and the Material 3 switch, with the platform's own behaviour, accessibility and animation. The kit's primitives stay React Native views; native controls are islands for the places where the native one wins.

## Example

```tsx
// Two files, one per platform entry point (picker.ios.tsx and picker.android.tsx).
import { Host, Picker } from '@expo/ui/swift-ui';

export function SortPicker({ value, onChange }: Props) {
  return (
    <Host matchContents>
      <Picker options={['Newest', 'Oldest']} selectedIndex={value} onOptionSelected={onChange} />
    </Host>
  );
}
```

UNVERIFIED: import paths, the `Host` props and each component's props change between releases. Treat the snippet as the shape only and read the versioned docs for the SDK you use.

Keep the same props and the same testID on both implementations so screens and tests do not branch.

## Limitations

- UNVERIFIED: the library is pre-stable. Expect API changes; pin the version and read the changelog on each upgrade.
- It adds a native module, so it needs a new development build.
- Two code paths to keep in step, and no web.
- Class-name styling does not reach SwiftUI or Compose views, and testID and accessibility pass-through must be checked per component.
- Layout inside a host view is sized differently from React Native layout. Test with large text and in both themes.

## Scope

- Fits: pickers, context menus, bottom sheets, date and time selection.
- Does not fit: buttons, text fields and cards, which the kit already styles with tokens.
