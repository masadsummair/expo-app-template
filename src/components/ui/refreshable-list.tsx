import { FlashList, type FlashListProps, type FlashListRef } from '@shopify/flash-list';
import type { ComponentType, ReactElement, Ref } from 'react';

export type RefreshableListProps<T> = Omit<
  FlashListProps<T>,
  'refreshing' | 'onRefresh' | 'ListEmptyComponent'
> & {
  refreshing: boolean;
  onRefresh: () => void;
  /** Shown when `data` is empty. Pass an `EmptyState` (or `LoadingView`/`ErrorState` while fetching). */
  ListEmptyComponent?: ComponentType | ReactElement | null;
  /** Required: `<screen>-list`. */
  testID: string;
  ref?: Ref<FlashListRef<T>>;
};

/**
 * FlashList v2 with pull-to-refresh. v2 measures items itself, so there is no `estimatedItemSize`.
 * `className` does not reach FlashList (third-party); style rows inside `renderItem`.
 */
export function RefreshableList<T>({
  refreshing,
  onRefresh,
  ListEmptyComponent,
  testID,
  ref,
  ...props
}: RefreshableListProps<T>) {
  return (
    <FlashList
      ref={ref}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={ListEmptyComponent}
      testID={testID}
      {...props}
    />
  );
}
