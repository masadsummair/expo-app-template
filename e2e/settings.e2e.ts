import { expect, test } from './support/open-app';

// Runs on both platforms (see sign-in.e2e.ts for the iOS 27 password-fill caveat).
test(
  'settings: theme switch, about sheet, cancel delete, sign out',
  async ({ openApp, signIn, screen }) => {
    await openApp();
    await signIn();

    await screen.getByTestId('home-settings').tap();
    await expect(screen.getByTestId('settings-screen')).toBeVisible({ timeout: 10_000 });

    // Theme: dark is selected after tapping it, then back to system so later tests start clean.
    await screen.getByTestId('settings-theme-dark').tap();
    await expect(screen.getByTestId('settings-theme-dark')).toBeSelected();
    await screen.getByTestId('settings-theme-system').tap();
    await expect(screen.getByTestId('settings-theme-system')).toBeSelected();

    // Form sheet opens and closes.
    await screen.getByTestId('settings-about').tap();
    await expect(screen.getByTestId('about-sheet')).toBeVisible({ timeout: 10_000 });
    await screen.getByTestId('about-close').tap();
    await expect(screen.getByTestId('about-sheet')).toBeHidden();

    // Delete account asks first; cancelling keeps the user signed in.
    await screen.getByTestId('settings-delete-account').tap();
    await expect(screen.getByText('Delete account?')).toBeVisible();
    // Native alert buttons: Android renders labels in uppercase ("CANCEL"), iOS as written.
    await screen.getByText(/^cancel$/i).tap();
    await expect(screen.getByTestId('settings-screen')).toBeVisible();

    await screen.getByTestId('settings-sign-out').tap();
    await expect(screen.getByTestId('sign-in-screen')).toBeVisible({ timeout: 10_000 });
  },
);
