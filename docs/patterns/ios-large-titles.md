# iOS large titles

Optional pattern. Apply it only on root and list screens, and test it on a device first.

## Concept

On iOS a root screen's navigation title can show large and collapse to the standard size as the content scrolls. The router's native stack exposes it as a header option, and the system drives the collapse from the scroll position of the first scroll view on the screen. Android has no equivalent and ignores the option.

## Example

```tsx
<Stack.Screen options={{ title: 'Orders', headerLargeTitle: true, headerTransparent: true }} />

<ScrollView contentInsetAdjustmentBehavior="automatic">{/* content */}</ScrollView>
```

For the collapse to follow the scroll, the scroll view must be the screen's first child and must let the system adjust its content inset (`automatic`). A wrapper that adds its own top padding for the safe area then double-counts the header: remove the top inset on these screens.

## Limitations

- UNVERIFIED: the scroll-view inset change needed with the template's screen wrapper has not been tried. Verify on a simulator and a device before adopting it.
- The collapse needs a native scroll view at the top of the screen. Whether a recycling list component drives it correctly is UNVERIFIED.
- UNVERIFIED: how a transparent header and large title look on iOS 26 with the new glass bars.
- Keyboard-avoiding wrappers can fight the inset adjustment.
- Detail screens, form sheets and modals should keep standard titles.

## Scope

- Fits: top-level tab roots and long lists on iOS.
- Does not fit: Android, detail screens, forms, screens that are not scrollable.
