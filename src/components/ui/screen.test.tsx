import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from './screen';

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  // Landscape-style insets: a cutout on the left and the nav bar on the right.
  useSafeAreaInsets: () => ({ top: 24, bottom: 20, left: 47, right: 32 }),
}));

describe('Screen', () => {
  it('always pads the side insets, even when edges only lists the bottom', async () => {
    await render(
      <Screen testID="s" edges={['bottom']}>
        <Text>body</Text>
      </Screen>,
    );
    expect(screen.getByTestId('s')).toHaveStyle({
      paddingTop: 0,
      paddingBottom: 20,
      paddingLeft: 47,
      paddingRight: 32,
    });
  });

  it('renders a footer that owns the bottom inset', async () => {
    await render(
      <Screen testID="s" preset="scroll" footer={<Text>Save</Text>}>
        <Text>body</Text>
      </Screen>,
    );
    expect(screen.getByText('Save')).toBeOnTheScreen();
    expect(screen.getByTestId('s')).toHaveStyle({ paddingTop: 24, paddingBottom: 0 });
  });
});
