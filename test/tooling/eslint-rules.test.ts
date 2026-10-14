// Proves the lint rules fire: a rule that silently checks nothing is worse than no rule.
// Fixtures are linted as if they were existing project files, so the config block (and TS project) for that path applies.
import { describe, expect, setDefaultTimeout, test } from 'bun:test';
import { ESLint, type Linter } from 'eslint';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

setDefaultTimeout(60_000); // the first typed lint loads the TypeScript project (about 6 s)

const ROOT = resolve(import.meta.dir, '../..');
const eslint = new ESLint({ cwd: ROOT });

const APP_FILE = 'src/lib/cn.ts';
const APP_TSX = 'src/components/offline-banner.tsx';
const TEST_FILES = [
  'src/lib/a11y.test.ts',
  'test/routes.test.ts',
  '.claude/hooks/hooks.test.ts',
  'e2e/settings.e2e.ts',
];
const BOUNDARY_FILES = [
  'src/services/api/client.ts',
  'src/config/env.ts',
  'src/lib/crash-reporting.ts',
];

async function lint(fixture: string, as: string): Promise<Linter.LintMessage[]> {
  const code = readFileSync(join(ROOT, 'test/tooling/fixtures', fixture), 'utf8');
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, as) });
  const messages = result?.messages ?? [];
  expect(messages.filter((m) => m.fatal)).toEqual([]); // a parse error would hide every other rule
  return messages;
}
const rules = (messages: Linter.LintMessage[]) =>
  [...new Set(messages.map((m) => m.ruleId ?? 'unused-disable-directive'))].sort();

test('app code: escape hatches, promise rules and type evasion all fire', async () => {
  const messages = await lint('src-bad.ts', APP_FILE);
  expect(rules(messages)).toEqual([
    '@typescript-eslint/ban-ts-comment',
    '@typescript-eslint/no-floating-promises',
    '@typescript-eslint/no-misused-promises',
    '@typescript-eslint/no-non-null-assertion',
    'no-console',
    'no-debugger',
    'no-empty',
    'no-restricted-syntax',
    'no-useless-catch',
    'unused-disable-directive',
  ]);
  const count = (id: string) => messages.filter((m) => m.ruleId === id).length;
  expect(count('@typescript-eslint/ban-ts-comment')).toBe(2); // ts-ignore, and ts-expect-error with a short reason
  // as unknown as, as never as, Record<string, unknown>, Record<PropertyKey, unknown>, { [key: string]: unknown }
  expect(count('no-restricted-syntax')).toBe(5);
});

test('app code: allowed forms stay quiet', async () => {
  expect(await lint('src-ok.tsx', APP_TSX)).toEqual([]);
});

test('API, env and crash-reporting boundaries may use record-like unknown bags, but not double casts', async () => {
  for (const file of BOUNDARY_FILES) {
    const syntax = (await lint('src-bad.ts', file)).filter(
      (m) => m.ruleId === 'no-restricted-syntax',
    );
    // Only the two double casts (via unknown, via never); the three record-like forms pass.
    expect(syntax.map((m) => m.message)).toEqual([
      expect.stringContaining('as unknown as'),
      expect.stringContaining('as unknown as'),
    ]);
    expect(syntax.map((m) => m.line)).toEqual([17, 21]);
  }
});

test('test files: focused or skipped tests fail, type evasion is allowed', async () => {
  for (const file of TEST_FILES) {
    const messages = await lint('tests-bad.ts', file);
    expect(rules(messages)).toEqual(['no-restricted-syntax']);
    expect(messages.map((m) => m.line)).toEqual([2, 3, 4, 5, 6, 7, 8]); // lines 10 and 11 (casts) pass
  }
});

// design.* cases: the config block of the file a fixture is linted as decides which selectors apply.
const OUTSIDE_KIT = 'src/components/offline-banner.tsx'; // src/** block, outside the UI kit
const INSIDE_KIT = 'src/components/ui/card.tsx'; // UI kit block
const FEATURE_FILE = 'src/components/error-fallback.tsx'; // src/** block, outside the UI kit
const KIT_TEST_FILE = 'src/components/ui/card.test.tsx'; // test block

const fixtureText = (name: string) =>
  readFileSync(join(ROOT, 'test/tooling/fixtures', name), 'utf8');

/** `// expect: <id>` must fire on its line; `// expect-none: <id>` must not. */
function markers(code: string) {
  return code.split('\n').flatMap((text, index) => {
    const must = text.match(/\/\/ expect: (design\.[\w-]+)/)?.[1];
    const mustNot = text.match(/\/\/ expect-none: (design\.[\w-]+)/)?.[1];
    return [
      ...(must ? [{ line: index + 1, id: must, fires: true }] : []),
      ...(mustNot ? [{ line: index + 1, id: mustNot, fires: false }] : []),
    ];
  });
}

const fires = (messages: Linter.LintMessage[], line: number, id: string) =>
  messages.some((m) => m.line === line && m.message.includes(`[${id}]`));
const designMessages = (messages: Linter.LintMessage[]) =>
  messages.filter((m) => m.message.includes('[design.'));

describe('design rules', () => {
  test('flag every marked line in the bad fixture', async () => {
    const messages = await lint('design-bad.tsx', OUTSIDE_KIT);
    const expected = markers(fixtureText('design-bad.tsx'));
    expect(expected.length).toBeGreaterThanOrEqual(15);
    for (const { line, id } of expected) expect(fires(messages, line, id)).toBe(true);
    for (const id of [
      'design.tokens-only',
      'design.ui-primitives',
      'design.testids',
      'design.font-scaling',
    ]) {
      expect(expected.some((m) => m.id === id)).toBe(true);
    }
  });

  test('point the Pressable ban at a control that exists: kit controls, or PressableScale for icon-only', async () => {
    const messages = await lint('design-bad.tsx', OUTSIDE_KIT);
    const message = messages.find(
      (m) => m.line === 4 && m.message.includes('[design.ui-primitives]'),
    )?.message;
    expect(message).toContain('Button, ListItem or Text');
    expect(message).toContain('PressableScale with min-h-12 min-w-12');
    expect(message).not.toContain('platform press feedback'); // PressableScale has no ripple
  });

  test('restrict the UI kit to @/lib and its own folder, but allow raw Pressable there', async () => {
    const messages = await lint('design-bad-ui.tsx', INSIDE_KIT);
    for (const { line, id, fires: expected } of markers(fixtureText('design-bad-ui.tsx'))) {
      expect(fires(messages, line, id)).toBe(expected);
    }
  });

  test('stay silent on token classes, UI kit components and kebab-case testIDs', async () => {
    expect(designMessages(await lint('design-good.tsx', FEATURE_FILE))).toEqual([]);
  });

  test('exempt test files', async () => {
    const [result] = await eslint.lintText("export const swatch = '#ff0000';\n", {
      filePath: join(ROOT, KIT_TEST_FILE),
    });
    expect(designMessages(result?.messages ?? [])).toEqual([]);
  });
});
