// Scans tracked files for secret formats with a fixed prefix. No entropy checks, so no noise.
// A secret in JS ships readable in both the iOS and the Android bundle. Run: bun run secrets:check
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PATTERNS: [name: string, pattern: RegExp][] = [
  ['Stripe live key', /sk_live_[0-9a-zA-Z]{16,}/],
  ['AWS access key id', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /gh[pousr]_[0-9a-zA-Z]{36,}/],
  ['GitHub fine-grained token', /github_pat_[0-9A-Za-z_]{22,}/],
  ['Anthropic API key', /sk-ant-[0-9a-zA-Z_-]{20,}/],
  ['Private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];
// Tests hold fake keys on purpose; the lockfile holds integrity hashes; binaries are not text.
const SKIP = /(^|\/)bun\.lock$|^test\/|\.test\.tsx?$|\.(png|jpe?g|ttf|otf)$/;

// Skip deleted-but-tracked files, submodules and every symlink: lstat does not follow a link out of the repo.
const isFile = (p: string) => {
  try {
    return lstatSync(p).isFile();
  } catch {
    return false;
  }
};

const root = join(import.meta.dir, '..');
const listed = spawnSync('git', ['ls-files', '-z'], {
  cwd: root,
  encoding: 'utf8',
});
if (listed.status !== 0) {
  console.error('secrets:check needs a git checkout (git ls-files failed).');
  process.exit(1);
}

const hits: string[] = [];
for (const file of listed.stdout
  .split('\0')
  .filter((f) => f && !SKIP.test(f) && isFile(join(root, f)))) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [name, pattern] of PATTERNS) {
      if (pattern.test(line)) hits.push(`${file}:${i + 1} looks like a ${name}`);
    }
  });
}

if (hits.length) {
  console.error(
    `${hits.join('\n')}\nRemove the secret and rotate it. Real values belong in EAS env vars or a gitignored file.`,
  );
  process.exit(1);
}
console.log('secrets:check ok');
