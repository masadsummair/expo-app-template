import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './button';

describe('Button', () => {
  it('is findable by testID and exposes its label to accessibility', async () => {
    await render(<Button label="Save" testID="form-save" onPress={() => {}} />);
    expect(screen.getByTestId('form-save')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" testID="form-save" onPress={onPress} />);
    await fireEvent.press(screen.getByTestId('form-save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks presses and reports busy while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" testID="form-save" loading onPress={onPress} />);
    await fireEvent.press(screen.getByTestId('form-save'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('form-save')).toBeBusy();
  });
});
