import { fireEvent, render, screen } from '@testing-library/react-native';

import * as haptics from '@/lib/haptics';

import { resetPlatform, setPlatform } from '../../../test/platform';
import { Button } from './button';

jest.mock('@/lib/haptics', () => ({ tap: jest.fn() }));
jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: (name: string) => (name === '--color-ripple' ? '#0000001f' : undefined),
}));

afterEach(() => {
  resetPlatform();
  jest.clearAllMocks();
});

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

  it('gives no haptic by default and one light tap when asked', async () => {
    await render(<Button label="Save" testID="form-save" onPress={() => {}} />);
    await fireEvent.press(screen.getByTestId('form-save'));
    expect(haptics.tap).not.toHaveBeenCalled();
    await render(<Button label="Save" testID="form-save-haptic" haptic onPress={() => {}} />);
    await fireEvent.press(screen.getByTestId('form-save-haptic'));
    expect(haptics.tap).toHaveBeenCalledTimes(1);
  });

  it('wraps a long label instead of shrinking or truncating it (AX5, font scale 2)', async () => {
    await render(<Button label="Save and continue" testID="form-save" onPress={() => {}} />);
    const label = screen.getByText('Save and continue');
    expect(label.props.numberOfLines).toBeUndefined();
    expect(label.props.adjustsFontSizeToFit).toBeUndefined();
    expect(label.props.minimumFontScale).toBeUndefined();
    expect(label.props.className).toContain('shrink');
    expect(screen.getByTestId('form-save').props.className).toContain('py-3');
  });

  it('Android: bounded ripple clipped to the rounded corners by a parent, no iOS pressed classes', async () => {
    setPlatform('android');
    await render(<Button label="Save" testID="form-save" onPress={() => {}} />);
    const button = screen.getByTestId('form-save');
    expect(button.props.nativeBackgroundAndroid).toMatchObject({
      type: 'RippleAndroid',
      borderless: false,
    });
    expect(button.props.className).not.toContain('active:');
    // The ripple is drawn in the pressable's own background, which its own overflow-hidden does not clip
    // (that only clips children). A rounded overflow-hidden parent clips it.
    const clip = button.parent;
    expect(clip?.props.className).toContain('overflow-hidden');
    expect(clip?.props.className).toContain('rounded-xl');
  });

  it('puts wrapperClassName on the clipping wrapper and className on the pressable', async () => {
    await render(
      <Button
        label="Light"
        testID="theme-light"
        wrapperClassName="mt-4 flex-1"
        className="px-3"
        onPress={() => {}}
      />,
    );
    const button = screen.getByTestId('theme-light');
    const wrapper = button.parent;
    const wrapperClasses = wrapper?.props.className.split(' ');
    const buttonClasses = button.props.className.split(' ');
    expect(wrapperClasses).toEqual(
      expect.arrayContaining(['overflow-hidden', 'rounded-xl', 'mt-4', 'flex-1']),
    );
    expect(wrapperClasses).not.toContain('px-3');
    expect(buttonClasses).toContain('px-3');
    // A caller's padding replaces the default rather than stacking with it.
    expect(buttonClasses).not.toContain('px-5');
    expect(buttonClasses).not.toContain('mt-4');
    expect(buttonClasses).not.toContain('flex-1');
  });

  it('iOS: no ripple; solid fills swap to the pressed token, outlined ones fade', async () => {
    setPlatform('ios');
    await render(
      <>
        <Button label="A" testID="a" onPress={() => {}} />
        <Button label="B" testID="b" variant="danger" onPress={() => {}} />
        <Button label="C" testID="c" variant="secondary" onPress={() => {}} />
        <Button label="D" testID="d" variant="ghost" onPress={() => {}} />
      </>,
    );
    expect(screen.getByTestId('a').props.nativeBackgroundAndroid).toBeUndefined();
    expect(screen.getByTestId('a').props.className).toContain('active:bg-primary-pressed');
    expect(screen.getByTestId('b').props.className).toContain('active:bg-danger-pressed');
    expect(screen.getByTestId('c').props.className).toContain('active:opacity-pressed');
    expect(screen.getByTestId('d').props.className).toContain('active:opacity-pressed');
  });

  it('gives every variant the same 1dp border, so buttons side by side are the same height', async () => {
    // The pressable sits in a clipping wrapper and does not stretch with it: a borderless variant would be 2dp
    // shorter than an outlined one in a row (Settings theme picker).
    await render(
      <>
        <Button label="A" testID="a" onPress={() => {}} />
        <Button label="B" testID="b" variant="secondary" onPress={() => {}} />
        <Button label="C" testID="c" variant="ghost" onPress={() => {}} />
        <Button label="D" testID="d" variant="danger" onPress={() => {}} />
      </>,
    );
    for (const id of ['a', 'b', 'c', 'd']) {
      expect(screen.getByTestId(id).props.className.split(' ')).toContain('border');
    }
  });

  it('keeps the label drawable when the variant switches at runtime (Settings theme picker)', async () => {
    // On Android, removing the border width from a rounded view that clips its children (overflow-hidden)
    // clipped the label away after secondary -> primary: the label became invisible until relaunch. The
    // pressable must not clip its children, and every variant keeps the same border width.
    setPlatform('android');
    const { rerender } = await render(
      <Button label="Light" testID="theme-light" variant="secondary" onPress={() => {}} />,
    );
    const before = screen.getByTestId('theme-light').props.className.split(' ');
    await rerender(
      <Button label="Light" testID="theme-light" variant="primary" onPress={() => {}} />,
    );
    const after = screen.getByTestId('theme-light').props.className.split(' ');
    for (const classes of [before, after]) {
      expect(classes).not.toContain('overflow-hidden');
      expect(classes).toContain('border');
    }
  });

  it('dims through the disabled token, not a literal', async () => {
    await render(<Button label="Save" testID="form-save" disabled onPress={() => {}} />);
    expect(screen.getByTestId('form-save').props.className).toContain('opacity-disabled');
  });
});
