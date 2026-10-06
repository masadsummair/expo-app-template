import { render, screen } from '@testing-library/react-native';

import { announce } from '@/lib/a11y';

import { FormError } from './form-error';

jest.mock('@/lib/a11y', () => ({ announce: jest.fn() }));

describe('FormError', () => {
  it('renders nothing without a message', async () => {
    await render(<FormError testID="sign-in-error" />);
    expect(screen.queryByTestId('sign-in-error')).toBeNull();
    expect(announce).not.toHaveBeenCalled();
  });

  it('shows the message in a polite live region and announces it', async () => {
    await render(<FormError message="Wrong password" testID="sign-in-error" />);
    const node = screen.getByTestId('sign-in-error');
    expect(node.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText('Wrong password')).toBeTruthy();
    expect(announce).toHaveBeenCalledWith('Wrong password');
  });
});
