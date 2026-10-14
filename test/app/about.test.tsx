import { render, screen } from '@testing-library/react-native';

import AboutSheet from '@/app/(app)/about';

import { resetPlatform, setPlatform } from '../platform';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0', sdkVersion: '57.0.0' } },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

afterEach(resetPlatform);

describe('About sheet', () => {
  it.each([
    ['ios', '26.0'],
    ['ios', '18.4'],
    ['android', 36],
  ] as const)(
    '%s %s: the scroll view sets no background class, the navigator paints it',
    async (os, version) => {
      setPlatform(os, version);
      await render(<AboutSheet />);
      expect(screen.getByTestId('about-sheet').props.className).not.toMatch(/\bbg-/);
    },
  );

  it('keeps the e2e close testID', async () => {
    setPlatform('ios', '26.0');
    await render(<AboutSheet />);
    expect(screen.getByTestId('about-close')).toBeTruthy();
  });
});
