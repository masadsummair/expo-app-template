import { fireEvent, render, screen } from '@testing-library/react-native';

import { Switch } from './switch';

jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: () => undefined,
}));

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
});
