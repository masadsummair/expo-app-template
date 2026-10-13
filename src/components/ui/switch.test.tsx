import { fireEvent, render, screen } from '@testing-library/react-native';

import * as haptics from '@/lib/haptics';

import { Switch } from './switch';

jest.mock('@/lib/haptics', () => ({ toggle: jest.fn() }));
jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: () => undefined,
}));

afterEach(() => jest.clearAllMocks());

describe('Switch', () => {
  it('exposes switch role, label and checked state on the whole row', async () => {
    await render(
      <Switch
        label="Notifications"
        value
        testID="settings-notifications"
        onValueChange={() => {}}
      />,
    );
    const el = screen.getByTestId('settings-notifications');
    expect(el.props.accessibilityRole).toBe('switch');
    expect(el.props.accessibilityLabel).toBe('Notifications');
    expect(el.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('toggles when the row or its label is pressed', async () => {
    const onValueChange = jest.fn();
    await render(
      <Switch
        label="Notifications"
        value={false}
        testID="settings-notifications"
        onValueChange={onValueChange}
      />,
    );
    await fireEvent.press(screen.getByTestId('settings-notifications'));
    await fireEvent.press(screen.getByText('Notifications'));
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('does not toggle while disabled', async () => {
    const onValueChange = jest.fn();
    await render(
      <Switch
        label="Notifications"
        value={false}
        disabled
        testID="settings-notifications"
        onValueChange={onValueChange}
      />,
    );
    await fireEvent.press(screen.getByTestId('settings-notifications'));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('fires one toggle haptic per press, with the new value', async () => {
    const { rerender } = await render(
      <Switch label="Alerts" value={false} testID="s" onValueChange={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('s'));
    expect(haptics.toggle).toHaveBeenCalledTimes(1);
    expect(haptics.toggle).toHaveBeenLastCalledWith(true);
    await rerender(<Switch label="Alerts" value onValueChange={() => {}} testID="s" />);
    await fireEvent.press(screen.getByTestId('s'));
    expect(haptics.toggle).toHaveBeenCalledTimes(2);
    expect(haptics.toggle).toHaveBeenLastCalledWith(false);
  });

  it('dims a disabled label through the disabled token', async () => {
    await render(<Switch label="Alerts" value disabled testID="s" onValueChange={() => {}} />);
    expect(screen.getByText('Alerts').props.className).toContain('opacity-disabled');
  });
});
