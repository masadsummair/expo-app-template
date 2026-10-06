import {
  Easing,
  GentleSpringConfigWithDuration,
  ReduceMotion,
  SnappySpringConfigWithDuration,
} from 'react-native-reanimated';

/*
 * Shared motion presets so every animation in the app feels the same on iOS and Android.
 * Rules (see AGENTS.md "Motion"):
 * - Animate transform and opacity only (layout props and shadows are expensive, worst on Android).
 * - Every preset follows the system "reduce motion" setting (ReduceMotion.System): with it on,
 *   animations jump to their final value instead of moving.
 * - Write an explicit 'worklet' directive in useAnimatedStyle/gesture callbacks: the React Compiler
 *   can otherwise hoist them off the UI thread (software-mansion/react-native-reanimated#6826).
 */
export const spring = {
  /** UI feedback: press, toggle, small moves. No overshoot. */
  snappy: { ...SnappySpringConfigWithDuration, duration: 350, reduceMotion: ReduceMotion.System },
  /** Larger surfaces: cards, sheets, reveals. Soft settle. */
  gentle: { ...GentleSpringConfigWithDuration, reduceMotion: ReduceMotion.System },
} as const;

export const timing = {
  /** Fades and colour changes. */
  fast: { duration: 150, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System },
  /** Enter/exit of content. */
  normal: { duration: 250, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
} as const;

/** Scale applied while a PressableScale is held. Subtle on purpose. */
export const PRESSED_SCALE = 0.97;
