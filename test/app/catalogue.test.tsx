import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, render, screen } from '@testing-library/react-native';

import CatalogueScreen from '@/app/(app)/catalogue';
import * as ui from '@/components/ui';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('sonner-native', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('@/lib/a11y', () => ({ announce: jest.fn() }));
// The shared uniwind mock resolves every class to {}; give `text-body` the iOS values for this file.
jest.mock('uniwind', () => ({
  ...jest.requireActual('../mocks/uniwind'),
  useResolveClassNames: () => ({ fontSize: 17, lineHeight: 22 }),
}));

/** FlashList reports its load from a requestAnimationFrame (mocked as setTimeout 0): flush it inside act. */
async function renderCatalogue() {
  await render(<CatalogueScreen />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** `EmptyState` -> `empty-state`, matching the `catalogue-<export>` testID on each section. */
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

describe('dev catalogue', () => {
  it('shows every export of the UI kit', async () => {
    await renderCatalogue();
    const missing = Object.keys(ui).filter(
      (name) => !screen.queryByTestId(`catalogue-${kebab(name)}`, { includeHiddenElements: true }),
    );
    // A new UI export needs a section in src/app/(app)/catalogue.tsx with testID `catalogue-<kebab-name>`.
    expect(missing).toEqual([]);
  });

  it('shows the resolved body size so the platform token can be checked on a device', async () => {
    await renderCatalogue();
    expect(screen.getByTestId('catalogue-body-metrics')).toHaveTextContent('body 17/22');
  });
});

describe('dev catalogue swatches', () => {
  const root = join(__dirname, '../..');
  const names = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map((m) => m[1]);

  it('lists exactly the --color-* tokens of src/global.css', () => {
    const css = readFileSync(join(root, 'src/global.css'), 'utf8');
    const source = readFileSync(join(root, 'src/app/(app)/catalogue.tsx'), 'utf8');
    const block = source.match(/const SWATCHES = \{([^}]*)\} as const;/)?.[1];
    if (!block) throw new Error('SWATCHES not found in catalogue.tsx');

    const tokens = [...new Set(names(css, /--color-([\w-]+):/g))].sort();
    const pairs = [...block.matchAll(/^\s*'?([\w-]+)'?: '(bg-[\w-]+)',$/gm)].map(
      (m) => [m[1], m[2]] as const,
    );

    expect(tokens.length).toBeGreaterThan(0);
    // A new colour token needs a swatch (and a removed token its swatch dropped) in the catalogue.
    expect(pairs.map(([key]) => key).sort()).toEqual(tokens);
    // Each swatch paints its own token: `primary: 'bg-danger'` must fail.
    expect(pairs.filter(([key, cls]) => cls !== `bg-${key}`)).toEqual([]);
  });
});
