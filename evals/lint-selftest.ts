#!/usr/bin/env bun
/**
 * Proves scripts/lint-claude.ts catches what `claude plugin validate` misses.
 * Builds a deliberately broken .claude/ in a temp dir and asserts every defect is reported.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "lint-claude-"));
const write = (rel: string, text: string) => {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, text);
};

write(".mcp.json", JSON.stringify({ mcpServers: { "agent-device": { command: "bunx" } } }));
write(".claude/skills/good/SKILL.md", "---\nname: good\ndescription: Do a thing. Use when asked for the thing.\n---\nDo not use for other things.\n");
write(".claude/skills/wrong-folder/SKILL.md", "---\nname: other-name\ndescription: Use when needed.\n---\nNot for x.\n");
write(".claude/skills/too-long/SKILL.md", `---\nname: too-long\ndescription: ${"Use when x. ".repeat(150)}\n---\nNot for x.\n`);
write(".claude/skills/unknown-key/SKILL.md", "---\nname: unknown-key\ndescription: Use when x.\nbogus: 1\n---\nNot for x.\n");
write(".claude/skills/no-use/SKILL.md", "---\nname: no-use\ndescription: Does a thing.\n---\nNot for x.\n");
write(".claude/skills/bad-yaml/SKILL.md", "---\nname: bad-yaml\ndescription: [unclosed\n---\nbody\n");
write(".claude/skills/long-file/SKILL.md", `---\nname: long-file\ndescription: Use when x.\n---\nNot for x.\n${"line\n".repeat(520)}`);
write(".claude/skills/broken-link/SKILL.md", "---\nname: broken-link\ndescription: Use when x.\n---\nNot for x. See [ref](references/missing.md).\n");
write(".claude/agents/bad-agent.md", "---\nname: bad-agent\ndescription: Use when x.\ntools: Read, Edit, Frobnicate, AskUserQuestion, mcp__nope\nmodel: gpt\ncolor: magenta\nskills: ghost\n---\nbody\n");
write(".claude/agents/unclosed.md", "---\nname: unclosed\ndescription: Use when x.\n");
write(".claude/agents/code-reviewer.md", "---\nname: code-reviewer\ndescription: Use before merging. Not for style.\ntools: Read, Write\nmodel: sonnet\n---\nbody\n");

const proc = Bun.spawnSync(["bun", join(import.meta.dir, "..", "scripts", "lint-claude.ts"), root], { stdout: "pipe", stderr: "pipe" });
const out = proc.stdout.toString() + proc.stderr.toString();
rmSync(root, { recursive: true, force: true });

const expected: [string, RegExp][] = [
  ["name/folder mismatch", /does not match folder "wrong-folder"/],
  ["description over 1,536 chars", /too-long.*Claude Code cap|description \+ when_to_use is \d+ chars \(Claude Code cap/],
  ["unknown skill key", /unknown frontmatter key "bogus"/],
  ["description without 'Use'", /no-use.*when to use/],
  ["invalid YAML", /bad-yaml.*not valid YAML/],
  ["SKILL.md over 500 lines", /long-file.*lines \(limit 500\)/],
  ["broken relative link", /broken-link.*broken relative link: references\/missing\.md/],
  ["unknown agent tool", /unknown tool "Frobnicate"/],
  ["subagent-forbidden tool", /"AskUserQuestion" is never available/],
  ["undeclared MCP server", /MCP server "nope"/],
  ["invalid model", /invalid model "gpt"/],
  ["invalid color", /invalid color "magenta"/],
  ["missing skill reference", /skills: "ghost" does not exist/],
  ["unclosed agent frontmatter", /unclosed\.md.*frontmatter/],
  ["reviewer with Write", /must not have Edit or Write/],
];

let failed = proc.exitCode === 0 ? 1 : 0;
if (proc.exitCode === 0) console.error("FAIL  lint exited 0 on a broken fixture");
for (const [label, re] of expected) {
  const ok = re.test(out);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}`);
}
if (/good\/SKILL\.md/.test(out)) {
  failed++;
  console.log("FAIL  clean skill was flagged");
}
if (failed) console.error(`\n${out}`);
process.exit(failed ? 1 : 0);
