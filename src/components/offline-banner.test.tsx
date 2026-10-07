import { fireEvent, render, screen } from '@testing-library/react-native';

import { useOnlineStatus } from '@/hooks/use-online-status';

import { OfflineBanner } from './offline-banner';

jest.mock('@/hooks/use-online-status');
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/a11y', () => ({ announce: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

const mockedOnline = jest.mocked(useOnlineStatus);

describe('OfflineBanner', () => {
  it('renders nothing and reports height 0 while online', async () => {
    mockedOnline.mockReturnValue(true);
    const onHeightChange = jest.fn();
    await render(<OfflineBanner onHeightChange={onHeightChange} />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();
    expect(onHeightChange).toHaveBeenLastCalledWith(0);
  });

  it('owns the bottom inset and reports its measured height while offline', async () => {
    mockedOnline.mockReturnValue(false);
    const onHeightChange = jest.fn();
    await render(<OfflineBanner onHeightChange={onHeightChange} />);
    const banner = screen.getByTestId('offline-banner');
    expect(banner).toHaveStyle({ paddingBottom: 34 + 8 });
    await fireEvent(banner, 'layout', { nativeEvent: { layout: { height: 80 } } });
    expect(onHeightChange).toHaveBeenLastCalledWith(80);
  });
});
