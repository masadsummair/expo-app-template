# Skeleton loading or spinner

Optional pattern. Apply it only when a screen's load feels slow with a spinner.

## Concept

Neither iOS nor Android ships a skeleton component, so a skeleton is custom UI. Use the right indicator for the wait:

- **Spinner** (the native activity indicator): short or unknown waits, button actions, anything under roughly 300 ms (UNVERIFIED: rule of thumb, not a platform number).
- **Skeleton**: a list or card whose layout is known and whose content takes longer. It keeps the layout stable and shows where content will land.
- **Pull to refresh**: use the native refresh control, not a skeleton.

## Example

```tsx
function SkeletonBlock({ className }: { className: string }) {
  const opacity = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!reduceMotion) opacity.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
  }, [opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style} className={`bg-divider rounded-md ${className}`} />;
}
```

- Match the real row's height and spacing so nothing jumps when data arrives.
- Hide the blocks from screen readers and expose one busy state for the region ("Loading").
- Under Reduce Motion show static blocks. A pulse is gentler than a moving shimmer.
- Adapt the animation to the template's motion presets when you copy this.

## Limitations

- Mismatched skeletons cause layout shift, which is worse than a spinner.
- Each skeleton is extra code to keep in step with its screen.
- UNVERIFIED: a gradient shimmer can drop frames on low-end Android devices; prefer the opacity pulse.
- Empty and error states still need their own views.

## Scope

- Fits: first load of lists and detail screens with predictable layout.
- Does not fit: refreshes of already visible content, short actions, unpredictable layouts.
