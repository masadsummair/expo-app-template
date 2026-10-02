---
name: api-endpoint
description: Add a typed backend API call with zod validation, TanStack Query hooks, and tests. Use when asked to fetch data, call an endpoint, add a mutation, or connect a screen to the backend.
---

# API endpoint

The contract lives in `src/services/api/`:
- `client.ts` — `request()` returns `ApiResult<T>` and **never throws**; `requestOrThrow()` unwraps it for
  TanStack Query and throws `ApiError` carrying the problem.
- `api-problem.ts` — the `ApiProblem` union (`unauthorized`, `not-found`, `server`, `timeout`, `bad-data`, ...).
  Problems with `temporary: true` are retried by the query client; others are not.

## Steps

1. **Schema first.** One file per resource: `src/services/api/<resource>.ts`. Every response is parsed by a
   zod schema — the type comes from the schema (`XSchema` → `type X = z.infer<typeof XSchema>`), never a hand-written interface.

```ts
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { requestOrThrow } from './client';

export const OrderSchema = z.object({ id: z.string(), total: z.number(), status: z.enum(['open', 'paid']) });
export type Order = z.infer<typeof OrderSchema>;

export const orderKeys = {
  all: ['orders'] as const,
  detail: (id: string) => ['orders', id] as const,
};

export const ordersQuery = () =>
  queryOptions({
    queryKey: orderKeys.all,
    queryFn: () => requestOrThrow({ path: '/orders', schema: z.array(OrderSchema) }),
  });

export function usePayOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      requestOrThrow({ path: `/orders/${encodeURIComponent(id)}/pay`, method: 'POST', schema: OrderSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}
```

2. **Consume in the screen** with `useQuery(ordersQuery())` and render loading / error / empty / success.
   Map errors for the user with `error instanceof ApiError ? error.problem.kind : 'unknown'`.
3. **Auth:** the bearer token is attached automatically from `useAuthStore`. An `unauthorized` problem from
   any query or mutation signs the user out centrally (`src/lib/query-client.ts`) and sign-out clears the
   query cache — don't handle 401 per screen.
4. **Paths:** always start with `/` and wrap every dynamic segment in `encodeURIComponent()` — ids can come
   from deep links. `request()` throws if a path would leave the API origin, so the token can't leak.
5. **Test** in `<resource>.test.ts`: mock `globalThis.fetch` (see `client.test.ts` for the helpers) and cover
   success, schema mismatch (`bad-data`), and one error status.

## Rules

- No `fetch` outside `client.ts`. No `useEffect` data fetching. No `any` — widen the schema instead.
- Query keys come from the resource's `*Keys` object so invalidation stays consistent.
- The base URL is `env.API_URL` (`EXPO_PUBLIC_API_URL`). Never put API secrets in `EXPO_PUBLIC_*` —
  they ship in the bundle. Anything secret belongs on your server.
