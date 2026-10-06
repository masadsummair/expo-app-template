import { z } from 'zod';

import { requestOrThrow } from './client';

/*
 * In-app account deletion is required by Apple (App Store Review Guideline 5.1.1(v)) for any app
 * with sign-up, and expected by Google Play. Point this at your backend's real endpoint; it must
 * delete the account and its data server-side, not just sign the user out.
 */
export async function deleteAccount(): Promise<void> {
  // 204, or any 2xx with a JSON body (200 {}, 202 {"status":"queued"}) means deleted; the body is ignored.
  // A 2xx with an empty non-204 body is reported as bad-data by the client — have the backend send 204.
  await requestOrThrow({ path: '/account', method: 'DELETE', schema: z.unknown() });
}
