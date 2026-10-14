// Linted as src/components/ui/design-bad-ui.tsx.
import { Pressable, type PressableProps } from 'react-native'; // expect-none: design.ui-primitives

import { cn } from '@/lib/cn';
import { Screen } from '../../../src/components/ui/screen'; // expect: design.ui-primitives
import { useAuthStore } from '@/stores/auth-store'; // expect: design.ui-primitives

export function Row(props: PressableProps) {
  return <Pressable {...props} />;
}

export const orphan = <Pressable onPress={() => undefined} />; // expect: design.testids

export { cn, Screen, useAuthStore };
