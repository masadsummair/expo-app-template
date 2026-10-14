import { onlineManager } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { act } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

import { RefreshableList } from './refreshable-list';
import { BottomBannerHeightContext } from './screen';
import { Text } from './text';

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: (name: string) =>
    ({ '--color-muted': '#636369', '--color-primary': '#2563eb', '--color-surface': '#f4f4f5' })[
      name
    ],
}));

function List({
  refreshing,
  onRefresh = () => {},
  contentContainerStyle,
}: {
  refreshing: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <RefreshableList
      data={[] as string[]}
      renderItem={({ item }) => <Text>{item}</Text>}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={<Text>Nothing here</Text>}
      contentContainerStyle={contentContainerStyle}
      testID="home-list"
    />
  );
}

const control = () => screen.getByTestId('home-list').props.refreshControl;
const padding = () =>
  StyleSheet.flatten(screen.getByTestId('home-list').props.contentContainerStyle);

describe('RefreshableList', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('shows ListEmptyComponent for empty data', async () => {
    await render(<List refreshing={false} />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('does not show the spinner for a background refetch', async () => {
    await render(<List refreshing />);
    expect(control().props.refreshing).toBe(false);
  });

  it('shows the spinner for the user pull until the refetch ends', async () => {
    const onRefresh = jest.fn();
    const { rerender } = await render(<List refreshing={false} onRefresh={onRefresh} />);
    await act(async () => control().props.onRefresh());
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(control().props.refreshing).toBe(true);
    await rerender(<List refreshing onRefresh={onRefresh} />);
    expect(control().props.refreshing).toBe(true);
    await rerender(<List refreshing={false} onRefresh={onRefresh} />);
    expect(control().props.refreshing).toBe(false);
  });

  it('offline: a pull still calls onRefresh but shows no spinner, because the query pauses', async () => {
    onlineManager.setOnline(false);
    const onRefresh = jest.fn();
    await render(<List refreshing={false} onRefresh={onRefresh} />);
    await act(async () => control().props.onRefresh());
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(control().props.refreshing).toBe(false);
  });

  it('colours the spinner from the theme tokens', async () => {
    await render(<List refreshing={false} />);
    expect(control().props).toMatchObject({
      tintColor: '#636369',
      colors: ['#2563eb'],
      progressBackgroundColor: '#f4f4f5',
    });
  });

  it('pads the bottom safe-area inset, unless a banner below owns it', async () => {
    await render(<List refreshing={false} />);
    expect(padding()).toMatchObject({ paddingBottom: 34 });
    await render(
      <BottomBannerHeightContext value={60}>
        <List refreshing={false} />
      </BottomBannerHeightContext>,
    );
    expect(padding()).toMatchObject({ paddingBottom: 0 });
  });

  it('keeps a caller contentContainerStyle (object or array) alongside the inset', async () => {
    await render(<List refreshing={false} contentContainerStyle={{ paddingHorizontal: 16 }} />);
    expect(padding()).toMatchObject({ paddingBottom: 34, paddingHorizontal: 16 });
    await render(
      <List
        refreshing={false}
        contentContainerStyle={[{ paddingHorizontal: 8 }, { backgroundColor: 'red' }]}
      />,
    );
    expect(padding()).toMatchObject({
      paddingBottom: 34,
      paddingHorizontal: 8,
      backgroundColor: 'red',
    });
  });
});
