#!/usr/bin/env bun
/**
 * Copies .claude/skills to .agents/skills, the folder Codex and Gemini CLI scan for skills.
 * A copy, not a symlink: symlinks need elevated rights or Developer Mode on Windows.
 * Usage: bun scripts/sync-agent-skills.ts [--check] [repoRoot]
 *   (no flag)  rewrite .agents/skills from .claude/skills
 *   --check    change nothing; exit 1 if .agents/skills differs (file list or contents, CRLF ignored)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const check = args.includes("--check");
const root = resolve(args.find((a) => !a.startsWith("--")) ?? process.cwd());
const src = join(root, ".claude", "skills");
const dest = join(root, ".agents", "skills");

const README = `# Generated, do not edit

This folder is a copy of \`.claude/skills/\`, made for Codex and Gemini CLI, which scan
\`.agents/skills/\` and not \`.claude/skills/\`. Edit the skills in \`.claude/skills/\`, then run:

    bun run skills:sync

\`bun run verify\` fails when this copy has drifted. Cursor reads both folders, so it lists each
skill twice; delete \`.agents/\` if you only use Cursor and Claude Code.
`;

/** Relative POSIX-style path -> bytes, for every file under dir (skips OS junk files). */
function collect(dir: string, rel = "", out = new Map<string, Buffer>()): Map<string, Buffer> {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store" || entry.name === "Thumbs.db") continue;
    const path = join(dir, entry.name);
    const key = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) collect(path, key, out);
    else if (entry.isFile()) out.set(key, readFileSync(path));
  }
  return out;
}

const normalise = (b: Buffer) => b.toString("latin1").replace(/\r\n/g, "\n");

const expected = collect(src);
if (expected.size === 0) {
  console.error(`sync-agent-skills: no files under ${src}`);
  process.exit(1);
}
expected.set("README.md", Buffer.from(README));

if (check) {
  const actual = collect(dest);
  const problems: string[] = [];
  for (const [key, buf] of expected) {
    const have = actual.get(key);
    if (!have) problems.push(`missing: .agents/skills/${key}`);
    else if (normalise(have) !== normalise(buf)) problems.push(`differs: .agents/skills/${key}`);
  }
  for (const key of actual.keys()) {
    if (!expected.has(key)) problems.push(`extra: .agents/skills/${key}`);
  }
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    console.error("\n.agents/skills is out of date. Run: bun run skills:sync");
    process.exit(1);
  }
  console.log(`.agents/skills matches .claude/skills (${expected.size} files)`);
} else {
  rmSync(dest, { recursive: true, force: true });
  for (const [key, buf] of expected) {
    const file = join(dest, ...key.split("/"));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, buf);
  }
  console.log(`wrote ${expected.size} files to .agents/skills`);
}
