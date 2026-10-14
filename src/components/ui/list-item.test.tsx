import { fireEvent, render, screen } from '@testing-library/react-native';

import { resetPlatform, setPlatform } from '../../../test/platform';
import { ListItem } from './list-item';

jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: () => undefined,
}));

afterEach(resetPlatform);

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

  it('iOS: chevron, row highlight token, no ripple', async () => {
    setPlatform('ios');
    await render(<ListItem title="Profile" onPress={() => {}} testID="menu-profile" />);
    const row = screen.getByTestId('menu-profile');
    expect(row.props.className).toContain('active:bg-ripple');
    expect(row.props.nativeBackgroundAndroid).toBeUndefined();
    expect(
      screen.getByTestId('menu-profile-chevron', { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it('Android: no chevron, a bounded ripple, no iOS highlight', async () => {
    setPlatform('android');
    await render(<ListItem title="Profile" onPress={() => {}} testID="menu-profile" />);
    const row = screen.getByTestId('menu-profile');
    expect(row.props.nativeBackgroundAndroid).toMatchObject({
      type: 'RippleAndroid',
      borderless: false,
    });
    expect(row.props.className).not.toContain('active:');
    expect(
      screen.queryByTestId('menu-profile-chevron', { includeHiddenElements: true }),
    ).toBeNull();
  });

  it('dims a disabled row through the disabled token', async () => {
    await render(<ListItem title="Profile" disabled onPress={() => {}} testID="menu-profile" />);
    expect(screen.getByTestId('menu-profile').props.className).toContain('opacity-disabled');
  });
});
