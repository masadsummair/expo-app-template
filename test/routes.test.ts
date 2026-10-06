/// <reference types="node" />
// Node types for this file only: the app tsconfig deliberately leaves them out.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Expo Router bundles every file under src/app as a route. A test there pulls Jest and Testing Library into the
// app bundle and crashes it at launch ("Unable to resolve module console"), which unit tests never notice.
// Screen tests live in test/app/ instead.
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

test('src/app holds routes only, no test files', () => {
  const tests = files(join(__dirname, '..', 'src', 'app')).filter(
    (f) => /\.(test|spec|e2e)\.[cm]?[jt]sx?$/.test(f) || /[\\/]__(tests|mocks)__[\\/]/.test(f),
  );
  expect(tests).toEqual([]);
});
