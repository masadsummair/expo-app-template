import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PressableScale } from './pressable-scale';

describe('PressableScale', () => {
  it('is a labelled button that calls onPress', async () => {
    const onPress = jest.fn();
    await render(
      <PressableScale testID="home-card" accessibilityLabel="Open orders" onPress={onPress}>
        <Text>Orders</Text>
      </PressableScale>,
    );
    expect(screen.getByRole('button', { name: 'Open orders' })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('still calls caller press-in/out handlers', async () => {
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    await render(
      <PressableScale
        testID="home-card"
        accessibilityLabel="Open orders"
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Text>Orders</Text>
      </PressableScale>,
    );
    await fireEvent(screen.getByTestId('home-card'), 'pressIn');
    await fireEvent(screen.getByTestId('home-card'), 'pressOut');
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressOut).toHaveBeenCalledTimes(1);
  });

  it('puts className on the pressable so padding is tappable', async () => {
    await render(
      <PressableScale testID="home-card" accessibilityLabel="Open orders" className="p-4 min-h-12">
        <Text>Orders</Text>
      </PressableScale>,
    );
    expect(screen.getByTestId('home-card').props.className).toBe('p-4 min-h-12');
  });
});
