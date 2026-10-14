import { isReleaseBuild } from './support/build-mode';
import { expect, test } from './support/open-app';

// The catalogue is __DEV__ only: a release-style build does not have it.
test(
  'catalogue: body text is 17pt on iOS and 16sp on Android',
  { skip: isReleaseBuild ? 'the catalogue is __DEV__ only' : false },
  async ({ openApp, signIn, screen, platform }) => {
    await openApp();
    await signIn();

    await screen.getByTestId('home-settings').tap();
    await screen.getByTestId('settings-catalogue').tap();
    await expect(screen.getByTestId('catalogue-screen')).toBeVisible({ timeout: 10_000 });

    // The @variant ios / android values of --text-body in src/global.css, resolved at runtime.
    await expect(screen.getByTestId('catalogue-body-metrics')).toHaveText(
      platform === 'ios' ? 'body 17/22' : 'body 16/24',
    );
  },
);

test('about sheet: the close control is visible and closes the sheet', async ({
  openApp,
  signIn,
  screen,
}) => {
  await openApp();
  await signIn();

  await screen.getByTestId('home-settings').tap();
  await screen.getByTestId('settings-about').tap();
  await expect(screen.getByTestId('about-sheet')).toBeVisible({ timeout: 10_000 });
  // The iOS "Done" label vs the Android X is asserted in sheet-header.test.tsx; here only the control is checked.
  await expect(screen.getByTestId('about-close')).toBeVisible();
  await screen.getByTestId('about-close').tap();
  await expect(screen.getByTestId('about-sheet')).toBeHidden();
});
