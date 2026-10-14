# Android predictive back

Optional pattern. The template keeps it off; revisit it when the opt-out goes away.

## Concept

Predictive back (Android 13 and newer) shows a preview of where the back gesture will go, such as the previous screen or the home screen, before the user commits. An app takes part by opting in to the new back-invoked callback in its Android manifest. Google's migration path makes the new behaviour the default for apps targeting newer Android versions and keeps an opt-out that Google calls temporary. When the opt-out is removed, the app must support the gesture.

## Example

Stay off, explicitly:

- Set the app config's Android predictive-back option to false. UNVERIFIED: the Expo config key is `android.predictiveBackGestureEnabled`; confirm in the versioned config reference.
- Verify the built manifest after prebuild rather than trusting the config.

Move to on:

1. Enable the option and rebuild.
2. Replace screen-level `BackHandler` listeners ("discard changes?" prompts) with the router's navigation-level guards. With the gesture on, `BackHandler` callbacks are not invoked the way they are today. UNVERIFIED: exact behaviour under React Native's current release.
3. Test each stack on Android 13+, including form sheets and nested navigators.

## Limitations

- UNVERIFIED: how fully the native stack library supports the back preview for every transition type.
- Custom back interception breaks silently when the gesture is on.
- It only exists on Android 13+ with the developer option or system setting enabled (UNVERIFIED: the exact setting path varies by version).
- Keeping it off is technical debt with an unknown deadline.

## Scope

- Fits: Android apps with simple stack navigation and no custom back handling.
- Does not fit: iOS (it has its own edge-swipe back), apps with heavy `BackHandler` logic until it is migrated.
