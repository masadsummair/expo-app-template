// Proves a check script added to package.json cannot be forgotten in `verify`.
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '../..');

const IS_CHECK = /^(lint|typecheck|test)(:|$)|:check$/;
// These need a booted device or an argument, so `verify` cannot run them.
const NOT_IN_VERIFY = [/^test:e2e/, /^specs:check$/];

function missingFromVerify(scripts: Record<string, string>): string[] {
  const steps = (scripts.verify ?? '').split('&&').map((step) => step.trim());
  return Object.keys(scripts).filter(
    (name) =>
      IS_CHECK.test(name) &&
      !NOT_IN_VERIFY.some((skip) => skip.test(name)) &&
      !steps.includes(`bun run ${name}`),
  );
}

test('every check script is part of verify', () => {
  const { scripts } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  expect(missingFromVerify(scripts)).toEqual([]);
});

test('the wiring check catches a forgotten script and honours the allowlist', () => {
  const scripts = {
    verify: 'bun run lint && bun run test',
    lint: 'eslint .',
    test: 'jest',
    'secrets:check': 'bun scripts/check-secrets.ts',
    'format:check': 'prettier --check .',
    'test:e2e:ios': 'e2e run',
    'specs:check': 'bun scripts/check-ac-coverage.ts',
  };
  expect(missingFromVerify(scripts)).toEqual(['secrets:check', 'format:check']);
});
