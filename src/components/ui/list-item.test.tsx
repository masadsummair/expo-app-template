import { fireEvent, render, screen } from '@testing-library/react-native';

import { ListItem } from './list-item';

jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: () => undefined,
}));

describe('ListItem', () => {
  it('is a plain row without role or chevron when not pressable', async () => {
    await render(<ListItem title="Name" subtitle="Ada" />);
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByTestId('x-chevron', { includeHiddenElements: true })).toBeNull();
  });

  it('is a button with a hidden chevron and calls onPress when pressable', async () => {
    const onPress = jest.fn();
    await render(
      <ListItem title="Profile" subtitle="Edit" onPress={onPress} testID="menu-profile" />,
    );
    expect(screen.getByRole('button', { name: 'Profile, Edit' })).toBeTruthy();
    const chevron = screen.getByTestId('menu-profile-chevron', {
      includeHiddenElements: true,
    });
    expect(chevron.props.accessibilityElementsHidden).toBe(true);
    expect(screen.queryByTestId('menu-profile-chevron')).toBeNull();
    await fireEvent.press(screen.getByTestId('menu-profile'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
