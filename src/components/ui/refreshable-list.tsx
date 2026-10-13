import { FlashList, type FlashListProps, type FlashListRef } from '@shopify/flash-list';
import { onlineManager } from '@tanstack/react-query';
import { use, useState, type ComponentType, type ReactElement, type Ref } from 'react';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomBannerHeightContext } from './screen';
import { useColorToken } from './tokens';

export type RefreshableListProps<T> = Omit<
  FlashListProps<T>,
  'refreshing' | 'onRefresh' | 'refreshControl' | 'ListEmptyComponent'
> & {
  /** True while the query refetches (`isRefetching`). The spinner shows only for the user's own pull. */
  refreshing: boolean;
  /**
   * Must start a refetch (`query.refetch`). The spinner shows for the user's pull only; offline the pull still
   * refetches but shows no spinner, because the query pauses.
   */
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
 *
 * The spinner shows for a user pull only: a background refetch (focus, reconnect) must not slide a spinner
 * down under the user's thumb. The list pads its own bottom safe-area inset so the last row clears the home
 * indicator or navigation bar: render list screens with `<Screen edges={[]}>` so the inset is not applied twice.
 * An offline banner below the screen owns the inset while it shows (BottomBannerHeightContext).
 */
export function RefreshableList<T>({
  refreshing,
  onRefresh,
  ListEmptyComponent,
  testID,
  ref,
  contentContainerStyle,
  ...props
}: RefreshableListProps<T>) {
  const { bottom } = useSafeAreaInsets();
  const bannerHeight = use(BottomBannerHeightContext);
  const muted = useColorToken('--color-muted');
  const primary = useColorToken('--color-primary');
  const surface = useColorToken('--color-surface');

  // Adjust state while rendering (React's pattern for "reset when a prop changes"): the pull ends when the
  // refetch ends. No effect, because React Compiler lint rejects setState in an effect body.
  const [pulled, setPulled] = useState(false);
  const [wasRefreshing, setWasRefreshing] = useState(refreshing);
  if (refreshing !== wasRefreshing) {
    setWasRefreshing(refreshing);
    if (!refreshing) setPulled(false);
  }

  return (
    <FlashList
      ref={ref}
      refreshControl={
        <RefreshControl
          refreshing={pulled}
          onRefresh={() => {
            // A paused (offline) query never sets isRefetching, so a spinner shown now would never clear.
            if (onlineManager.isOnline()) setPulled(true);
            onRefresh();
          }}
          tintColor={muted} // iOS spinner
          colors={primary ? [primary] : undefined} // Android spinner
          progressBackgroundColor={surface} // Android spinner disc
        />
      }
      ListEmptyComponent={ListEmptyComponent}
      testID={testID}
      // Array, not a spread: a caller's style may itself be an array or a registered style.
      contentContainerStyle={[
        { paddingBottom: bannerHeight > 0 ? 0 : bottom },
        contentContainerStyle,
      ]}
      {...props}
    />
  );
}
