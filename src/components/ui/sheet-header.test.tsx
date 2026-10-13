import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { resetPlatform, setPlatform } from '../../../test/platform';
import { SheetHeader } from './sheet-header';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('expo-symbols', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: (props: object) => <View testID="symbol" {...props} /> };
});
jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: (name: string) => (name === '--color-ripple' ? '#0000001f' : undefined),
}));

afterEach(() => {
  resetPlatform();
  jest.clearAllMocks();
});

describe('SheetHeader', () => {
  it('iOS: a "Done" text button on the trailing side, no icon, no ripple', async () => {
    setPlatform('ios');
    await render(<SheetHeader title="About" testID="about" />);
    const close = screen.getByRole('button', { name: 'Done' });
    expect(close.props.testID).toBe('about-close');
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByTestId('symbol', { includeHiddenElements: true })).toBeNull();
    expect(close.props.nativeBackgroundAndroid).toBeUndefined();
    await fireEvent.press(close);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('Android: an X icon button with a borderless ripple that stays inside its 48dp box', async () => {
    setPlatform('android');
    await render(<SheetHeader title="About" testID="about" />);
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.props.testID).toBe('about-close');
    expect(screen.getByTestId('symbol', { includeHiddenElements: true }).props.name).toEqual({
      ios: 'xmark',
      android: 'close',
    });
    expect(close.props.nativeBackgroundAndroid).toMatchObject({
      borderless: true,
      rippleRadius: 24,
    });
    await fireEvent.press(close);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('keeps a 48dp minimum target on both platforms', async () => {
    await render(<SheetHeader title="About" testID="about" />);
    expect(screen.getByTestId('about-close').props.className).toContain('min-h-12 min-w-12');
  });
});
