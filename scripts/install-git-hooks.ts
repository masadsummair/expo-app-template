/**
 * Points git at the committed hooks in .githooks (pre-commit runs `bun run verify`; this template has no CI).
 * Runs from `prepare` on `bun install`. Never fails the install: it does nothing outside a git checkout (e.g. a
 * downloaded zip or an EAS build), leaves an existing core.hooksPath (husky, lefthook, your own) alone, and only
 * warns when git is missing.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const MANUAL = 'run `git config core.hooksPath .githooks` to enable the pre-commit checks';

if (!existsSync(join(root, '.git'))) process.exit(0);

function git(...args: string[]): { ok: boolean; out: string } {
  try {
    const result = Bun.spawnSync(['git', ...args], { cwd: root });
    return { ok: result.exitCode === 0, out: result.stdout.toString().trim() };
  } catch {
    return { ok: false, out: '' }; // git not on PATH
  }
}

const current = git('config', '--get', 'core.hooksPath').out;
if (current === '.githooks') process.exit(0);
if (current) {
  console.warn(`install-git-hooks: core.hooksPath is already "${current}"; leaving it. To use this template's hooks, ${MANUAL}.`);
  process.exit(0);
}
if (!git('config', 'core.hooksPath', '.githooks').ok) {
  console.warn(`install-git-hooks: could not configure git; ${MANUAL}.`);
  process.exit(0);
}
console.log('install-git-hooks: pre-commit now runs `bun run verify` (skip once with git commit --no-verify).');
