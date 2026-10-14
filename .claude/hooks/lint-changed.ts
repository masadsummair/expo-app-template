// PostToolUse(Edit|Write|MultiEdit): format and lint only the file that just changed, so Claude sees errors
// immediately. Full typecheck stays in `bun run verify` (too slow per edit).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

type Input = { tool_input?: { file_path?: unknown } };

export async function main(): Promise<void> {
  let input: Input;
  try {
    input = JSON.parse(await Bun.stdin.text()) as Input;
  } catch {
    process.stderr.write('Claude Code hook could not read its JSON input.\n');
    process.exit(2);
  }

  const file = input.tool_input?.file_path;
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const eslint = join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');
  const prettier = join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  // Claude Code's file tools always pass an absolute path; a relative one (`-x`) could read as a flag.
  if (typeof file !== 'string' || !isAbsolute(file) || !existsSync(file)) return;
  // The hook must not rewrite files outside the project (Prettier would apply its defaults there).
  const rel = relative(root, file);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return;

  // Run each tool's JS entry with bun itself: node_modules/.bin/* are .cmd shims on Windows.
  // Format first so ESLint sees the final text. Prettier skips unknown file types and anything in .prettierignore.
  // Only the root .prettierrc: an explicit --config stops Prettier from loading (running) a nested config file.
  if (existsSync(prettier)) {
    const result = spawnSync(
      process.execPath,
      [
        prettier,
        '--config',
        join(root, '.prettierrc'),
        '--no-editorconfig',
        '--write',
        '--ignore-unknown',
        '--',
        file,
      ],
      { cwd: root, encoding: 'utf8' },
    );
    if (result.status !== 0) {
      process.stderr.write(
        `Prettier could not format ${file}, fix the syntax error:\n${result.stdout}${result.stderr}\n`,
      );
      process.exit(2);
    }
  }
  if (/\.(ts|tsx|js|jsx)$/.test(file) && existsSync(eslint)) {
    const result = spawnSync(
      process.execPath,
      [eslint, '--no-warn-ignored', '--max-warnings', '0', '--', file],
      {
        cwd: root,
        encoding: 'utf8',
      },
    );
    if (result.status !== 0) {
      process.stderr.write(
        `ESLint errors or warnings in ${file}, fix before continuing:\n${result.stdout}${result.stderr}\n`,
      );
      process.exit(2);
    }
  }
}

if (import.meta.main) await main();
