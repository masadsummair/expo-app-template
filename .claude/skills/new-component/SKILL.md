---
name: new-component
description: Create or modify a reusable UI component using the project's Uniwind tokens, React 19 patterns, accessibility, and testID conventions. Use when asked to add a component, button, card, input, list item, or UI primitive.
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
      className={cn('rounded-full px-3 py-1.5 active:opacity-80', variants[variant], className)}
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
  `accessibilityRole` + `accessibilityLabel`. Touch targets are at least 44×44 (`min-h-12`).
- Use `Pressable`, not `TouchableOpacity`. Use `Text` from `@/components/ui`, not `react-native`.
- Third-party components that don't accept `className`: wrap with `withUniwind()` from `uniwind`.

## Test

Components with logic (variants, disabled/loading states, conditional rendering) get a
`<name>.test.tsx` next to them using React Native Testing Library (`react-native-testing` skill):
query by role or testID, assert what the user sees.
