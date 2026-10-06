import { test as base } from '@e2e-dev/mobile';
import { expect } from 'e2e';

import { DEV_CLIENT_SCHEME, DEV_SERVER_URL, isReleaseBuild } from './build-mode';

/** A cold JS bundle load in a dev build takes 20-60s on an emulator. Used for the first wait only. */
const FIRST_LOAD_MS = isReleaseBuild ? 15_000 : 90_000;

/** iOS shows its "Save Password?" sheet a moment after a sign-in with a password field. */
const SAVE_PASSWORD_PROMPT_MS = 8_000;

/**
 * `test` with an `openApp` fixture. Every test starts with `await openApp()` and gets the sign-in screen:
 *  1. launch the app fresh;
 *  2. dev build on Android: hand the dev launcher the Metro URL (it ignores --initialUrl there);
 *  3. dismiss the one-time dev-menu sheet if it shows;
 *  4. if a previous test left the user signed in, sign out, so tests never depend on each other.
 */
export const test = base.extend<{ openApp: () => Promise<void>; signIn: () => Promise<void> }>({
  openApp: async ({ app, device, screen, platform }, provide) => {
    await provide(async () => {
      const signIn = screen.getByTestId('sign-in-screen');
      const home = screen.getByTestId('home-screen');
      const devMenuSheet = screen.getByText('This is the developer menu', { exact: false });

      await app.open();
      if (!isReleaseBuild && platform === 'android') {
        const link = `${DEV_CLIENT_SCHEME}://expo-development-client/?url=${encodeURIComponent(DEV_SERVER_URL)}`;
        await device.openLink(link);
      }

      // Whichever shows first: the sheet, the sign-in screen, or home (still signed in). This is the one
      // polling loop in the suite; a single condition would use expect(...).toBeVisible({ timeout }).
      const deadline = Date.now() + FIRST_LOAD_MS;
      while (Date.now() < deadline) {
        if ((await signIn.isVisible()) || (await home.isVisible()) || (await devMenuSheet.isVisible())) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (await devMenuSheet.isVisible()) {
        // The label sits in a group whose tappable child is an unnamed button, so a plain tap() is refused
        // ("no parent-owned touch point"). A positioned tap lands on the label and reaches the button.
        await screen.getByText('Continue').tap({ position: { x: 8, y: 8 } });
        // "Continue" sometimes opens the full dev menu instead of closing the sheet. Back closes the full
        // menu, but only press it when the menu is showing: otherwise Back leaves the app.
        if (await screen.getByText('Fast Refresh', { exact: false }).first().isVisible()) await device.back();
      }

      if (await home.isVisible()) await screen.getByTestId('home-sign-out').tap();
      await expect(signIn).toBeVisible({ timeout: 15_000 });
    });
  },
  /**
   * From the sign-in screen: sign in with the mock's demo credentials and land on home. On iOS, dismisses
   * the system "Save Password?" sheet (Not Now): it covers the app and would swallow the next tap.
   */
  signIn: async ({ screen, platform }, provide) => {
    await provide(async () => {
      await screen.getByTestId('sign-in-email').fill('test@example.com');
      await screen.getByTestId('sign-in-password').fill('password123');
      await screen.getByTestId('sign-in-submit').tap();

      // The sheet hides the whole app from the accessibility tree, so dismiss it before asserting home.
      if (platform === 'ios') {
        const notNow = screen.getByText('Not Now');
        const deadline = Date.now() + SAVE_PASSWORD_PROMPT_MS;
        while (Date.now() < deadline) {
          if (await notNow.isVisible()) {
            await notNow.tap();
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      await expect(screen.getByTestId('home-screen')).toBeVisible({ timeout: 10_000 });
    });
  },
});

export { expect };
