# Android FAB and bottom navigation

Optional pattern. Android only: do not copy it onto iOS.

## Concept

Material 3 gives two conventions that Android users expect:

- **Floating action button (FAB).** One per screen, for the screen's primary creation action ("New order"). It floats at the bottom end, above the navigation bar and the system gesture inset. The extended FAB adds a text label when the icon alone is ambiguous.
- **Bottom navigation bar.** For three to five top-level destinations on a phone. Each item has an icon and a label, and the selected item gets a pill-shaped active indicator.

The iOS equivalent of the FAB is a button in the navigation bar or toolbar, and iOS uses a tab bar instead of the Material navigation bar. Keep the platform difference; do not dress one platform in the other's style.

## Example

```tsx
function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="orders-new"
      android_ripple={{ borderless: false }}
      onPress={onPress}
      style={{ position: 'absolute', end: 16, bottom: 16 + insets.bottom }}
      className="size-14 items-center justify-center rounded-2xl bg-primary"
    >
      <Icon name={{ ios: 'plus', android: 'add' }} />
    </Pressable>
  );
}
```

Render it only on Android (`Platform.OS === 'android'`) and give iOS a toolbar button with the same testID and label. Adapt it to the template's kit (`PressableScale` instead of a raw `Pressable`) when you copy it.

## Limitations

- UNVERIFIED: Material 3 dimensions quoted from memory (FAB 56 dp, navigation bar about 80 dp, minimum touch target 48 dp). Check the current Material 3 pages.
- Cards stay flat in this design, so a FAB's elevation or tonal surface is a deliberate exception.
- The FAB can cover the last list row. Add bottom padding to the list equal to the FAB size.
- TalkBack needs the action name as the label, not "button".
- Large phones and tablets use a navigation rail in Material 3; tablets are out of scope for the template.

## Scope

- Fits: Android screens with one clear primary creation action; apps with three to five top-level sections.
- Does not fit: iOS, screens with several equal actions, apps with more than five top-level destinations.
