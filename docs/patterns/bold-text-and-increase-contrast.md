# Bold Text and Increase Contrast on iOS

Optional pattern. Apply it when accessibility testing shows the app ignores these settings.

## Concept

iOS users can turn on **Bold Text** and **Increase Contrast** (Settings, Accessibility, Display & Text Size). React Native reads both flags, and the app can adapt:

- Bold Text: raise font weights one step (regular to medium or semibold), because custom fonts are not bolded automatically.
- Increase Contrast: use darker or lighter text and stronger borders. iOS system colours adapt on their own; token colours do not.

## Example

```ts
function useIosFlag(
  read: () => Promise<boolean>,
  event: 'boldTextChanged' | 'darkerSystemColorsChanged',
) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void read().then(setEnabled);
    const sub = AccessibilityInfo.addEventListener(event, setEnabled);
    return () => sub.remove();
  }, [read, event]);
  return enabled;
}

const bold = useIosFlag(AccessibilityInfo.isBoldTextEnabled, 'boldTextChanged');
const highContrast = useIosFlag(
  AccessibilityInfo.isDarkerSystemColorsEnabled,
  'darkerSystemColorsChanged',
);
```

Feed the flags into the text variants (weight) and into a high-contrast token set (borders from 1 to 2 px, text one step darker). `DynamicColorIOS` can supply the high-contrast variants without a flag (see the platform colours pattern).

Check on a simulator: `xcrun simctl ui booted increase_contrast enabled`, and reset it afterwards. Bold Text is set in the Settings app of the simulator.

## Limitations

- The flags are read asynchronously, so the first frame can render with the default. Read them once at startup.
- UNVERIFIED: Android has a similar high-contrast text setting; the React Native API for it differs by version and was not checked.
- Jest cannot see these settings. Verify on a device or simulator.
- The template's contrast check covers the default token pairs only, not the high-contrast set.

## Scope

- Fits: iOS apps with custom fonts or brand colours that must stay readable.
- Does not fit: apps that use only system fonts and system colours, which adapt by themselves.
