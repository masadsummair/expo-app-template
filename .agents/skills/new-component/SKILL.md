---
name: new-component
description: Create or modify a reusable UI component using the project's Uniwind tokens, React 19 patterns, accessibility, and testID conventions. Use when asked to add a component, button, card, input, list item, or UI primitive. Do not use for a full screen/route (use new-screen) or a form (use add-form).
---

# New component

## Where it goes

- `src/components/ui/` — design-system primitives shared by the whole app (export from `index.ts`).
- `src/components/<feature>/` — components used by one feature.

Check `src/components/ui` first — extend an existing primitive with a `variant` before creating a new one.

## Pattern

```tsx
import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './text';

const variants = {
  default: 'bg-surface border border-border',
  selected: 'bg-primary',
} as const;

export type ChipProps = Omit<PressableProps, 'children'> & {
  label: string;
  testID: string;
  variant?: keyof typeof variants;
};

export function Chip({ label, variant = 'default', className, ...props }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: variant === 'selected' }}
      className={cn(
        'min-h-12 items-center justify-center rounded-full px-4 active:opacity-80',
        variants[variant],
        className,
      )}
      {...props}
    >
      <Text variant="caption" className={variant === 'selected' ? 'text-primary-foreground' : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}
```

## Rules

- **React 19:** named function components, `ref` is a normal prop (`ref?: Ref<TextInput>`). No `forwardRef`,
  no `React.FC`, no `memo`/`useMemo`/`useCallback` (React Compiler handles it).
- **Styling:** Uniwind `className` + semantic tokens from `src/global.css`. Merge overrides with `cn()` so a
  caller's `className` wins. Variants are a `const` map, not string concatenation in JSX. New colours are new
  tokens in **both** the light and dark variants of `global.css`.
- **Interactive = testable:** anything pressable or editable takes a **required** `testID` prop and sets
  `accessibilityRole` + `accessibilityLabel`. Touch targets are at least 44pt / 48dp: `min-h-12`, and
  `min-h-12 min-w-12` for icon-only controls. Wrap an `Icon` in a `Pressable` with those classes, never a bare one.
- Use `Pressable`, not `TouchableOpacity`. Use `Text` from `@/components/ui`, not `react-native`.
- Third-party components that don't accept `className`: wrap with `withUniwind()` from `uniwind`.

## Layout rules

- No fixed pixel widths on containers that hold text; use flex, `%` or `max-w-*`. Use `min-h-*`, not `h-*`, so
  text can grow. Fixed sizes are fine for icon and avatar boxes. No arbitrary values (`w-[220px]`).
- Text: `Text` variants only, never `allowFontScaling={false}`. It must not clip at font scale 2.
- Do not set a width on the component's root; the parent decides (`Screen` already caps the column).
- Cover default, pressed, focused, disabled and loading where they apply. `Button` and `TextField` are the models.

## Test

Components with logic (variants, disabled/loading states, conditional rendering) get a
`<name>.test.tsx` next to them using React Native Testing Library (`react-native-testing` skill):
query by role or testID, assert what the user sees.

On a device, check the component at 360dp wide, font scale 2 (`adb shell settings put system font_scale 2.0`),
600dp or wider, and in light and dark. Reset with `adb shell settings put system font_scale 1.0` and
`adb shell wm size reset`.
