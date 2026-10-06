import { expect, test } from './support/open-app';

// Select by testID only (getByTestId). Text and labels change; testIDs are the contract.
// Every test starts from the sign-in screen: openApp signs out if a previous test left a session behind.

test('empty submit shows both field errors and stays on sign-in', async ({ openApp, screen }) => {
  await openApp();

  await screen.getByTestId('sign-in-submit').tap();

  await expect(screen.getByTestId('sign-in-email-error')).toHaveText('Enter a valid email');
  await expect(screen.getByTestId('sign-in-password-error')).toHaveText('At least 8 characters');
  await expect(screen.getByTestId('home-screen')).toBeHidden();
});

test('an invalid email shows the email error and stays on sign-in', async ({ openApp, screen }) => {
  await openApp();

  await screen.getByTestId('sign-in-email').fill('not-an-email');
  await screen.getByTestId('sign-in-submit').tap();

  await expect(screen.getByTestId('sign-in-email-error')).toHaveText('Enter a valid email');
  await expect(screen.getByTestId('home-screen')).toBeHidden();
});

// tester-army/e2e#872 (fill() into a secureTextEntry field fails) reproduces on iOS 27 simulators but not
// on iOS 26.2, where this runs on both platforms. On iOS 27, add `{ platforms: ['android'] }` back.
test('signs in, lands on home, signs out', async ({ openApp, signIn, screen }) => {
  await openApp();
  await signIn();

  await screen.getByTestId('home-sign-out').tap();
  await expect(screen.getByTestId('sign-in-screen')).toBeVisible({ timeout: 10_000 });
});
