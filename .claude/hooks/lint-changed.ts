// PostToolUse(Edit|Write|MultiEdit): lint only the file that just changed, so Claude sees errors
// immediately. Full typecheck stays in `bun run verify` (too slow per edit).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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

  if (typeof file === 'string' && /\.(ts|tsx|js|jsx)$/.test(file) && existsSync(file) && existsSync(eslint)) {
    // Run eslint's JS entry with bun itself: node_modules/.bin/eslint is a .cmd shim on Windows.
    const result = spawnSync(process.execPath, [eslint, '--no-warn-ignored', file], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) {
      process.stderr.write(`ESLint errors in ${file}, fix before continuing:\n${result.stdout}${result.stderr}\n`);
      process.exit(2);
    }
  }
}

if (import.meta.main) await main();
