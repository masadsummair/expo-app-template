---
name: api-endpoint
description: Add a typed backend API call with zod validation, TanStack Query hooks (queries, pagination, mutations), the loading/error/empty/success screen, and tests. Use when asked to fetch data, call an endpoint, add a list or a mutation, or connect a screen to the backend. Do not use for client-only state (use add-store) or for auth provider setup.
---

# API endpoint

The contract lives in `src/services/api/`:
- `client.ts` — `request()` returns `ApiResult<T>` and does not throw for HTTP, network or schema errors (it still
  throws `Error` on an invalid path: a programmer error). `requestOrThrow()` unwraps it for TanStack Query and throws
  `ApiError` carrying the problem. Both accept `signal`; the 15s timeout lives only here.
- `api-problem.ts` — the `ApiProblem` union (`unauthorized`, `not-found`, `server`, `timeout`, `bad-data`, ...).
  Problems with `temporary: true` are retried by the query client (twice); others are not.
- `src/lib/error-message.ts` — `errorMessage(error)` gives safe user-facing copy for any thrown value.

## Steps

1. **One file per resource:** `src/services/api/<resource>.ts` holds the zod schema, the key factory, the
   `queryOptions`, and the hooks. Types come from the schema (`type X = z.infer<typeof XSchema>`), never a
   hand-written interface. Components never write `queryKey` or `queryFn` inline.

```ts
import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';

import { requestOrThrow } from './client';

export const OrderSchema = z.object({
  id: z.string(),
  total: z.number(),
  status: z.enum(['open', 'paid']),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderPageSchema = z.object({
  items: z.array(OrderSchema),
  nextCursor: z.string().nullable(),
});

/** Filters are always an object, so a new filter never changes the key's shape. */
export type OrderFilters = { status?: Order['status'] };

// Hierarchical keys: invalidating `lists()` hits every list and no detail; `all` hits everything.
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

function listPath(filters: OrderFilters, cursor?: string): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return query ? `/orders?${query}` : '/orders';
}

// Pass TanStack's `signal` so leaving the screen or a newer fetch aborts the request.
export const ordersQuery = (filters: OrderFilters = {}) =>
  queryOptions({
    queryKey: orderKeys.list(filters),
    queryFn: ({ signal }) =>
      requestOrThrow({ path: listPath(filters), schema: z.array(OrderSchema), signal }),
  });

export const orderQuery = (id: string) =>
  queryOptions({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) =>
      requestOrThrow({ path: `/orders/${encodeURIComponent(id)}`, schema: OrderSchema, signal }),
  });

export function usePayOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      requestOrThrow({
        path: `/orders/${encodeURIComponent(id)}/pay`,
        method: 'POST',
        schema: OrderSchema,
      }),
    // Default strategy: invalidate and let the screen refetch. Return the promise so
    // `isPending` stays true until the refetch finishes.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}
```

2. **Consume in the screen** with `useQuery(ordersQuery())` and render all four states (snippet below).
3. **Auth:** the bearer token is attached automatically from `useAuthStore`. An `unauthorized` problem from
   any query or mutation signs the user out centrally (`src/lib/query-client.ts`) and sign-out clears the
   query cache — don't handle 401 per screen.
4. **Paths:** always start with `/` and wrap every dynamic segment in `encodeURIComponent()` — ids can come
   from deep links. `request()` throws if a path would leave the API origin, so the token can't leak.
5. **Test** in `<resource>.test.ts`: mock `globalThis.fetch` (see `client.test.ts` for the helpers) and cover
   success, schema mismatch (`bad-data`), and one error status. For a hook, render it with
   `createQueryWrapper()` from `test/query-wrapper.tsx` (fresh client, no retries). Only `query-client.test.ts`
   touches the real `queryClient` singleton.

## Screen: loading, error, empty, success

Branch on `data` first: a failed background refetch keeps the stale list on screen instead of replacing it
with an error. Real props (see `src/components/ui/state-views.tsx`, `refreshable-list.tsx`):
`LoadingView` takes `testID` + optional `label`; `ErrorState` takes `testID`, `message`, `onRetry`, optional
`retryLabel`; `EmptyState` takes `testID`, `title`, optional `message` and `action: { label, onPress }`;
`RefreshableList` is FlashList plus required `refreshing`, `onRefresh` and `testID`.

```tsx
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import {
  EmptyState,
  ErrorState,
  ListItem,
  LoadingView,
  RefreshableList,
  Screen,
} from '@/components/ui';
import { errorMessage } from '@/lib/error-message';
import { ordersQuery } from '@/services/api/orders';

export default function OrdersScreen() {
  const { data, error, isError, isRefetching, refetch } = useQuery(ordersQuery());

  return (
    <Screen testID="orders-screen" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Orders' }} />
      {data ? (
        <RefreshableList
          testID="orders-list"
          data={data}
          keyExtractor={(order) => order.id}
          renderItem={({ item }) => (
            <ListItem
              title={`Order ${item.id}`}
              subtitle={`${item.status} · ${item.total}`}
              testID={`orders-row-${item.id}`}
              onPress={() => {}} // navigate to the detail route here
            />
          )}
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          ListEmptyComponent={
            <EmptyState testID="orders-empty" title="No orders yet" message="Orders you place show up here." />
          }
        />
      ) : isError ? (
        <ErrorState
          testID="orders-error"
          message={errorMessage(error)}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : (
        <LoadingView testID="orders-loading" label="Loading orders" />
      )}
    </Screen>
  );
}
```

- **Refresh spinner:** `refreshing={isRefetching}`, never `isFetching` (it is also true on the first load, so the
  pull-to-refresh spinner would show over the `LoadingView`).
- Do not rest-destructure a query result (`...rest`); it subscribes the component to every field.
- **No `useSuspenseQuery`** unless the screen has its own `Suspense` and `QueryErrorResetBoundary`. The state
  branches above are the default.
- **No query persistence by default.** Screens must work on a cold start with the network up. Add persistence only
  for an explicit offline requirement.

## Pagination

Use `infiniteQueryOptions` and a FlashList. Fetch the next page only when one exists and none is loading.

```ts
// in src/services/api/orders.ts
export const ordersInfiniteQuery = (filters: OrderFilters = {}) =>
  infiniteQueryOptions({
    queryKey: [...orderKeys.list(filters), 'infinite'] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      requestOrThrow({ path: listPath(filters, pageParam), schema: OrderPageSchema, signal }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
```

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { ActivityIndicator } from 'react-native';

import { ListItem, RefreshableList } from '@/components/ui';
import { ordersInfiniteQuery } from '@/services/api/orders';

export function OrdersList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching, refetch } =
    useInfiniteQuery(ordersInfiniteQuery());

  return (
    <RefreshableList
      testID="orders-list"
      data={data?.pages.flatMap((page) => page.items) ?? []}
      keyExtractor={(order) => order.id}
      renderItem={({ item }) => (
        <ListItem title={`Order ${item.id}`} testID={`orders-row-${item.id}`} onPress={() => {}} />
      )}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      // A refetch of an infinite query also sets isRefetching while fetching the next page.
      refreshing={isRefetching && !isFetchingNextPage}
      onRefresh={() => {
        void refetch();
      }}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator className="py-4" colorClassName="accent-primary" /> : null
      }
    />
  );
}
```

Wrap it in the same `data` / `isError` / loading branches as the screen above. `refetch()` re-fetches every
loaded page, in order.

## Mutations: how to update the cache

TanStack does not retry mutations by default; do not add `retry`. Pick the first row that fits.

| Strategy | Use when | How |
|---|---|---|
| Invalidate (default) | Any write | `onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all })` |
| `setQueryData`, then invalidate lists | The response is the full updated entity and the detail screen should update at once | `setQueryData(orderKeys.detail(order.id), order)`, then invalidate `orderKeys.lists()` |
| Optimistic via `variables` | One place shows the pending change (a row, a button) | Read `mutation.variables` and `mutation.isPending` in the UI; the cache is untouched, so there is nothing to roll back |
| Optimistic via `onMutate` | Several screens must show the change before the server answers | `cancelQueries`, snapshot, `setQueryData`; restore the snapshot in `onError`; invalidate in `onSettled` |

```tsx
// Optimistic via variables: show the pending state where the mutation is triggered.
const pay = usePayOrder();
const isPaying = pay.isPending && pay.variables === order.id;
// <Button label={isPaying ? 'Paying' : 'Pay'} loading={isPaying} ... />
```

```ts
// Optimistic via onMutate with rollback (extra option set for useMutation in usePayOrder).
onMutate: async (id: string) => {
  // Aborts in-flight fetches (this works because queryFns pass `signal`), so they can't overwrite the guess.
  await queryClient.cancelQueries({ queryKey: orderKeys.detail(id) });
  const previous = queryClient.getQueryData<Order>(orderKeys.detail(id));
  queryClient.setQueryData<Order>(orderKeys.detail(id), (old) =>
    old ? { ...old, status: 'paid' } : old,
  );
  return { previous };
},
onError: (_error, id, context) => {
  if (context?.previous) queryClient.setQueryData(orderKeys.detail(id), context.previous);
},
onSettled: (_data, _error, id) => queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) }),
```

## Rules

- No `fetch` outside `client.ts`. No `useEffect` data fetching. No `any` — widen the schema instead.
- Query keys come from the resource's `*Keys` factory and filters are objects, so invalidation stays consistent.
- Every `queryFn` forwards `signal`. Timeouts live only in `client.ts`.
- The base URL is `env.API_URL` (`EXPO_PUBLIC_API_URL`). Never put API secrets in `EXPO_PUBLIC_*` —
  they ship in the bundle. Anything secret belongs on your server.

## Verify

`bun run verify`, then check the screen on a device: first load, pull to refresh, airplane mode (error state
with retry), and an empty result.
