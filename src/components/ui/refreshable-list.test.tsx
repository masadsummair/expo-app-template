import { render, screen } from '@testing-library/react-native';

import { RefreshableList } from './refreshable-list';
import { Text } from './text';

describe('RefreshableList', () => {
  it('shows ListEmptyComponent for empty data and wires refresh props', async () => {
    const onRefresh = jest.fn();
    await render(
      <RefreshableList
        data={[] as string[]}
        renderItem={({ item }) => <Text>{item}</Text>}
        refreshing
        onRefresh={onRefresh}
        ListEmptyComponent={<Text>Nothing here</Text>}
        testID="home-list"
      />,
    );
    expect(screen.getByText('Nothing here')).toBeTruthy();
    const { refreshControl } = screen.getByTestId('home-list').props;
    expect(refreshControl.props.refreshing).toBe(true);
    expect(refreshControl.props.onRefresh).toBe(onRefresh);
  });
});
