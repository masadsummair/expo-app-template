import { render, screen } from '@testing-library/react-native';

import { resetPlatform, setPlatform } from '../../../test/platform';
import { TextField } from './text-field';

jest.mock('@/lib/a11y', () => ({ announce: jest.fn() }));
jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: (name: string) =>
    ({ '--color-primary': '#2563eb', '--color-selection': '#2563eb4d' })[name],
}));

afterEach(resetPlatform);

describe('TextField', () => {
  it('names the input and carries the error in its label', async () => {
    await render(<TextField label="Email" testID="sign-in-email" error="Enter a valid email" />);
    const input = screen.getByTestId('sign-in-email');
    expect(input.props.accessibilityLabel).toBe('Email, Enter a valid email');
    expect(screen.getByTestId('sign-in-email-error').props.accessibilityLiveRegion).toBe('polite');
  });

  it('iOS: opaque brand colour for caret and selection, body text uncapped', async () => {
    setPlatform('ios');
    await render(<TextField label="Email" testID="sign-in-email" />);
    const input = screen.getByTestId('sign-in-email');
    expect(input.props.selectionColor).toBe('#2563eb');
    expect(input.props.maxFontSizeMultiplier).toBeUndefined();
  });

  it('Android: translucent highlight, brand caret and handles, body capped at 2x', async () => {
    setPlatform('android');
    await render(<TextField label="Email" testID="sign-in-email" />);
    const input = screen.getByTestId('sign-in-email');
    expect(input.props.selectionColor).toBe('#2563eb4d');
    expect(input.props.cursorColor).toBe('#2563eb');
    expect(input.props.selectionHandleColor).toBe('#2563eb');
    expect(input.props.maxFontSizeMultiplier).toBe(2);
  });

  it('lets a caller override the colours', async () => {
    await render(<TextField label="Email" testID="sign-in-email" selectionColor="#000000" />);
    expect(screen.getByTestId('sign-in-email').props.selectionColor).toBe('#000000');
  });
});
