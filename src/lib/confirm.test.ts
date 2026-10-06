import { Alert, type AlertButton, type AlertOptions } from 'react-native';

import { confirm } from './confirm';

let spy: jest.SpyInstance;

beforeEach(() => {
  spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => spy.mockRestore());

function lastCall() {
  const [title, message, buttons, options] = spy.mock.calls[0] as [
    string,
    string | undefined,
    AlertButton[],
    AlertOptions,
  ];
  return { title, message, buttons, options };
}

describe('confirm', () => {
  it('resolves true when the confirm button is pressed', async () => {
    const result = confirm({ title: 'Delete?', message: 'Gone forever', confirmLabel: 'Delete' });
    const { buttons } = lastCall();
    expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'Delete']);
    buttons[1]?.onPress?.();
    await expect(result).resolves.toBe(true);
  });

  it('resolves false on cancel', async () => {
    const result = confirm({ title: 'Delete?' });
    lastCall().buttons[0]?.onPress?.();
    await expect(result).resolves.toBe(false);
  });

  it('resolves false when dismissed (Android back / tap outside)', async () => {
    const result = confirm({ title: 'Delete?' });
    lastCall().options.onDismiss?.();
    await expect(result).resolves.toBe(false);
  });

  it('marks the confirm button destructive on request', () => {
    void confirm({ title: 'Delete?', destructive: true });
    expect(lastCall().buttons[1]?.style).toBe('destructive');
  });
});
