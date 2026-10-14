import { render } from '@testing-library/react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { Toaster } from 'sonner-native';

import { resetPlatform, setPlatform } from '../../test/platform';
import { AppToaster } from './app-toaster';

jest.mock('sonner-native', () => ({ Toaster: jest.fn(() => null) }));
jest.mock('react-native-keyboard-controller', () => ({ useKeyboardState: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('uniwind', () => ({
  useCSSVariable: (name: string) =>
    ({
      '--color-surface': '#f4f4f5',
      '--color-divider': '#e4e4e7',
      '--color-foreground': '#18181b',
      '--color-muted': '#636369',
      '--color-primary': '#2563eb',
      '--color-primary-foreground': '#ffffff',
    })[name],
}));

function keyboard(height: number) {
  jest.mocked(useKeyboardState).mockImplementation(
    (selector) =>
      (selector as (state: { isVisible: boolean; height: number }) => unknown)({
        isVisible: height > 0,
        height,
      }) as never,
  );
}

const props = () => {
  const call = jest.mocked(Toaster).mock.calls.at(-1);
  if (!call) throw new Error('Toaster was not rendered');
  return call[0];
};

beforeEach(() => keyboard(0));
afterEach(() => {
  resetPlatform();
  jest.clearAllMocks();
});

describe('AppToaster', () => {
  it('iOS: top, with a close button, positioned by the system safe area', async () => {
    setPlatform('ios');
    await render(<AppToaster />);
    expect(props()).toMatchObject({ position: 'top-center', closeButton: true });
    expect(props().offset).toBeUndefined();
    expect(props().maxFontSizeMultiplier).toBe(1.5);
  });

  it('Android: bottom, no close button, above the navigation bar', async () => {
    setPlatform('android');
    await render(<AppToaster />);
    expect(props()).toMatchObject({ position: 'bottom-center', closeButton: false });
    expect(props().offset).toBe(24 + 16);
  });

  it('Android: lifts above the keyboard instead of hiding behind it', async () => {
    setPlatform('android');
    keyboard(300);
    await render(<AppToaster />);
    expect(props().offset).toBe(300 + 16);
  });

  it('colours the toast from the theme tokens', async () => {
    await render(<AppToaster />);
    expect(props().toastOptions).toMatchObject({
      style: { backgroundColor: '#f4f4f5', borderColor: '#e4e4e7' },
      titleStyle: { color: '#18181b' },
      descriptionStyle: { color: '#636369' },
      actionButtonStyle: { backgroundColor: '#2563eb' },
      actionButtonTextStyle: { color: '#ffffff' },
    });
  });
});
