---
name: design-system
description: Platform rules and judgement calls for UI in this app (one brand look, iOS and Android behaviour). Use when building or reviewing a screen or component, when choosing press feedback, haptics, text scaling, sheets, toasts, states or motion, and before device-checking a UI change. Do not use for component code structure (new-component), routing (expo-router) or animation timing (expo-animation).
---

# Design system

One brand look, platform-correct behaviour. **Shared:** tokens, component props, testIDs, copy, accessibility
roles. **Follows the platform:** press feedback, haptics, system chrome, sheets, toasts, text scaling. Never dress
one platform in the other's style: no iOS back chevrons or large-title text on Android, no ripple or FAB in iOS layouts.

Where things live: tokens in `src/global.css` (every colour in both `@variant light` and `@variant dark`);
components in `src/components/ui` (the list is `src/components/ui/index.ts`); every component in every state on the
dev catalogue (Settings > Component catalogue, development builds only, `src/app/(app)/catalogue.tsx`). The
enforced `design.*` rules are in `docs/standards.md`. This skill holds what no tool can check.

## Platform behaviour

| | iOS | Android |
|---|---|---|
| Body text | 17pt (`text-body`, `@variant ios`) | 16sp |
| Text scale caps | body and caption uncapped (to AX5, ~3.6x); title and heading 1.5; chrome 1.3 | body and caption 2x (the system maximum); title and heading 1.5; chrome 1.3 |
| Press feedback | outlined and text controls fade (`active:opacity-pressed`); solid fills swap to `-pressed` tokens; rows highlight (`active:bg-ripple`) | `android_ripple` via `useRipple()`: bounded on rows and buttons (a rounded one sits in a parent `View` with the same radius and `overflow-hidden`: the pressable's own `overflow-hidden` does not clip its ripple), borderless on icon buttons |
| Headers, back, sheets, alerts, Switch | native, do not override. iOS 26 is Liquid Glass: no `sheetCornerRadius`, no opaque sheet or bar background; new form sheets also set `contentStyle: sheetContentStyle()` so Liquid Glass shows; the sheet screen adds no `bg-*` class, native-stack paints it | native; title left, back arrow. Predictive back stays off (tracked debt) |
| Sheet close | "Done", trailing side | X icon |
| Pressable rows | chevron | no chevron |
| Toasts | top, close button | bottom above the nav bar and keyboard, no close button. A native form sheet covers them: show errors inline there |
| Pull to refresh | spinner for the user's pull only, never a background refetch | same |

## Text and icons

- Use the `Text` variants (`title`, `heading`, `body`, `caption`, `chrome`): size, weight, scale cap and heading role
  come with them. Never `allowFontScaling={false}` or `adjustsFontSizeToFit` (`design.font-scaling`).
- Labels wrap. Containers that hold text use `min-h-*`, never `h-*`, and no fixed widths.
- Icons beside text grow with it on iOS (to 2x); Android icons keep their size (non-linear text scaling leaves a scaled glyph well short of its box): use `Icon`, never a raw `SymbolView`. Icon-only controls are `min-h-12 min-w-12`
  (a `PressableScale` with a label: the kit has no icon button).
- `<Link asChild>` never wraps a raw `Pressable`. The
  vendored `expo-router` examples wrap a raw `Pressable`; in this template wrap a kit control (`Button`, `ListItem` or
  `PressableScale`) instead.

## Tokens and contrast

- Colour comes from tokens (`design.tokens-only`); radius and opacity use the token scale (not lint-checked). A new
  colour goes in light and dark, then
  `bun run contrast:check`: text 4.5:1, icons and outlines 3:1, pressed fills and solid fills under the Android ripple included.
- Faded text controls at `opacity-pressed` measure about 3.6:1 while pressed. Two Android ripple pairs are also under
  4.5:1 while pressed and not checked: ghost Button text on background (3.92 light, 4.05 dark) and ListItem caption on
  surface (4.11 light). These transient states are accepted. Never use `opacity-pressed` for resting text.
- Cards stay flat. There is no elevation scale; do not add shadows.

## States, one primary action

- Every screen and list shows loading, empty, error (with retry) and success; never the empty state while the first
  load resolves. Disabled controls use `opacity-disabled`; a loading `Button` keeps its width.
- One primary action per view: one `primary` Button (in the `Screen` `footer` for a form); the rest `secondary` or
  `ghost`. Destructive actions are `danger` and go through `confirm()` with a verb label ("Delete", never "OK").

## Motion

- Animate `transform` and `opacity` only, with the `@/lib/motion` presets (they follow Reduce Motion).
- With Reduce Motion on, remove parallax, zooms and large moves and cross-fade (opacity) instead. Never drop the
  state change itself, only its travel.

## Haptics

- Off by default (`Button` and `PressableScale` take `haptic`). Use `@/lib/haptics` for outcomes: `success`, `error`,
  `select` (pickers, segments), `toggle`. Never the only feedback, never on every tap.
- No extra haptic on a native Switch: our row already fires one `toggle` and the native control ignores touches.

## Screen readers

- VoiceOver has no live regions: `announce()` from `@/lib/a11y` for what appears without focus (errors, loading,
  toasts). TalkBack reads `accessibilityLiveRegion="polite"` on the visible node: keep it there and announce only
  content with no node, or it is read twice. `accessibilityRole="alert"` is silent on iOS.
- Group a row under one label on its `Pressable`; icons are decorative unless labelled. Modals and sheets:
  `accessibilityViewIsModal` on iOS (`aria-modal` is its iOS-only alias); on Android hide the content behind with
  `importantForAccessibility="no-hide-descendants"`. `accessibilityElementsHidden` also hides from XCUITest,
  so use it on decorative elements only.
- Text inputs show a `focus:` state. Buttons and rows rely on platform press feedback and need no focus ring.

## Device checks (use the catalogue)

iOS AX5: `xcrun simctl ui booted content_size accessibility-extra-extra-extra-large` (reset: `... content_size large`).
iOS Increase Contrast: `xcrun simctl ui booted increase_contrast enabled` (reset: `disabled`). Android text 2x:
`adb shell settings put system font_scale 2.0` (reset: `1.0`). Also dark mode, Reduce Motion, VoiceOver and
TalkBack. Nothing clips, overlaps or hides behind the keyboard. Reset every setting afterwards.
