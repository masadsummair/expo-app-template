import { toast as sonner } from 'sonner-native';

import { ApiError } from '@/services/api/api-problem';

import { errorMessage } from './error-message';
import { toast, toastError } from './toast';

jest.mock('sonner-native', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('./a11y', () => ({ announce: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { announce } = require('./a11y') as { announce: jest.Mock };

it('announces each toast for VoiceOver with the default iOS-only target', () => {
  toast.success('Saved', { description: 'All good' });
  expect(announce).toHaveBeenCalledWith('Saved. All good');
});

afterEach(() => jest.clearAllMocks());

describe('toast', () => {
  it('maps an action to a sticky toast with onClick', () => {
    const onPress = jest.fn();
    toast.info('Update ready', { action: { label: 'Restart', onPress } });
    const opts = (sonner.info as jest.Mock).mock.calls[0][1];
    expect(opts).toMatchObject({ action: { label: 'Restart' }, duration: Infinity });
    opts.action.onClick();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('delegates success, error and info to sonner-native', () => {
    toast.success('Saved', { description: 'All good' });
    toast.error('Failed');
    toast.info('FYI');
    expect(sonner.success).toHaveBeenCalledWith('Saved', { description: 'All good' });
    expect(sonner.error).toHaveBeenCalledWith('Failed', { description: undefined });
    expect(sonner.info).toHaveBeenCalledWith('FYI', { description: undefined });
  });

  it('toastError shows the friendly ApiError message', () => {
    const e = new ApiError({ kind: 'timeout', temporary: true });
    toastError(e);
    expect(sonner.error).toHaveBeenCalledWith(errorMessage(e), { description: undefined });
  });

  it('toastError uses the generic message for unknown errors', () => {
    toastError(new Error('internal detail'));
    expect(sonner.error).toHaveBeenCalledWith(errorMessage(null), { description: undefined });
  });
});
