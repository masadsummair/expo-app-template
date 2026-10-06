import { expect, test } from './support/open-app';

import { selectModelProvider } from './support/model';

// Agent steps call the model from e2e/support/model.ts. They are opt-in (E2E_AGENT=1 or E2E_MODEL_PROVIDER, plus an
// API key or a subscription login); otherwise these tests are skipped and the suite stays green. They use your
// plan's limits or cost per run: keep the deterministic tests as the required check and run these on demand.
const selected = selectModelProvider();
const skip = selected.provider ? false : selected.reason;

// Android only until it has run on iOS with a model: after sign-in, iOS shows a "Save Password?" system sheet
// over the app (the signIn fixture in support/open-app.ts dismisses it; an agent run has not been checked).
test('the agent signs in with the demo credentials', { skip, platforms: ['android'] }, async ({
  openApp,
  agent,
  screen,
}) => {
  await openApp();

  // One goal per act. These are throwaway demo values (the template's mock auth accepts anything). A real
  // password must go through credentials() or secrets() from 'e2e', never through params.
  await agent.act('sign in with email {email} and password {password}', {
    params: { email: 'test@example.com', password: 'password123' },
  });

  // Pair every agent step with a check that does not depend on the model.
  await expect(screen.getByTestId('home-screen')).toBeVisible({ timeout: 10_000 });
  await agent.assert('the app shows the signed-in home screen with a Sign out button');
});
