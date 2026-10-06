import { fireEvent, render, screen } from '@testing-library/react-native';

import { Switch } from './switch';

jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: () => undefined,
}));

describe('Switch', () => {
  it('exposes switch role, label and checked state', async () => {
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

  it('calls onValueChange with the new value', async () => {
    const onValueChange = jest.fn();
    await render(
      <Switch
        label="Notifications"
        value={false}
        testID="settings-notifications"
        onValueChange={onValueChange}
      />,
    );
    await fireEvent(screen.getByTestId('settings-notifications'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
