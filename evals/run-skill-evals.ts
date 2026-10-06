#!/usr/bin/env bun
/**
 * Skill trigger evals. Opt-in, costs tokens, never part of `verify`.
 *
 *   bun evals/run-skill-evals.ts                       # all cases, 3 runs each, sonnet
 *   bun evals/run-skill-evals.ts --only new-screen --runs 1
 *   bun evals/run-skill-evals.ts --model haiku --runs 1   # cheap smoke check, noisy
 *
 * For each prompt it runs `claude -p` with only the Skill and Read tools, project settings only and no MCP
 * servers, and records which skill Claude invokes first. The process is killed at the first top-level Skill
 * tool call, so no skill body is ever executed. Read evals/README.md first.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Expect = { skill: string } | { none: true };
type Case = { id: string; prompt: string; expect: Expect; near_miss?: boolean };

const root = resolve(import.meta.dir, "..");
const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};

const model = flag("model", "sonnet");
const runs = Number(flag("runs", "3"));
const concurrency = Number(flag("concurrency", "4"));
const only = flag("only", "");
const maxBudget = flag("max-budget-usd", "0.50"); // per call, hard stop
const timeoutMs = Number(flag("timeout-ms", "60000"));

if (!Number.isInteger(runs) || runs < 1) throw new Error("--runs must be a positive integer");
const claudePath = Bun.which("claude");
if (!claudePath) {
  console.error("claude CLI not found on PATH. Install Claude Code, then retry.");
  process.exit(2);
}
const claudeBin: string = claudePath;

if (process.env.ANTHROPIC_API_KEY) {
  console.warn("warning: ANTHROPIC_API_KEY is set, so calls bill that API key instead of your Claude login.");
}

const skillsDir = join(root, ".claude", "skills");
const projectSkills = new Set(readdirSync(skillsDir).filter((d) => existsSync(join(skillsDir, d, "SKILL.md"))));
const manualOnly = new Set(
  [...projectSkills].filter((s) =>
    /^disable-model-invocation:\s*true/m.test(readFileSync(join(skillsDir, s, "SKILL.md"), "utf8")),
  ),
);

const all: Case[] = JSON.parse(readFileSync(join(import.meta.dir, "skill-triggers.json"), "utf8")).cases;
const cases = all.filter((c) => {
  if ("skill" in c.expect && !projectSkills.has(c.expect.skill)) {
    console.log(`skip  ${c.id}: skill "${c.expect.skill}" is not in .claude/skills`);
    return false;
  }
  if ("skill" in c.expect && manualOnly.has(c.expect.skill)) {
    console.log(`skip  ${c.id}: "${c.expect.skill}" is user-invoked only (disable-model-invocation)`);
    return false;
  }
  return !only || ("skill" in c.expect ? c.expect.skill === only : c.id.startsWith(only));
});
if (!cases.length) {
  console.error("No cases to run.");
  process.exit(2);
}

const version = Bun.spawnSync([claudeBin, "--version"]).stdout.toString().trim() || "unknown";

type RunResult = { fired: string | null; loaded: boolean; cost: number };

/** One `claude -p` call. Returns the first top-level Skill invoked (plugin prefix stripped), or null. */
async function runOnce(prompt: string): Promise<RunResult> {
  const proc = Bun.spawn(
    [
      claudeBin, "-p", prompt,
      "--model", model,
      "--tools", "Skill,Read",
      "--max-turns", "2",
      "--max-budget-usd", maxBudget,
      "--no-session-persistence",
      "--setting-sources", "project",
      "--strict-mcp-config",
      "--output-format", "stream-json",
      "--verbose",
    ],
    { cwd: root, stdin: "ignore", stdout: "pipe", stderr: "ignore" },
  );
  const timer = setTimeout(() => proc.kill(), timeoutMs);
  const result: RunResult = { fired: null, loaded: false, cost: 0 };
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for await (const chunk of proc.stdout) {
      buffer += decoder.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let ev: any;
        try {
          ev = JSON.parse(line);
        } catch {
          continue;
        }
        if (ev.type === "system" && ev.subtype === "init") {
          const listed: string[] = Array.isArray(ev.skills) ? ev.skills.map((s: string) => s.replace(/^.*:/, "")) : [];
          result.loaded = listed.some((s) => projectSkills.has(s));
        }
        if (ev.type === "assistant" && !ev.parent_tool_use_id) {
          for (const block of ev.message?.content ?? []) {
            if (block.type === "tool_use" && block.name === "Skill" && !result.fired) {
              result.fired = String(block.input?.skill ?? "").replace(/^.*:/, "");
            }
          }
        }
        if (ev.type === "result") result.cost = Number(ev.total_cost_usd ?? 0);
        if (result.fired) {
          proc.kill(); // exit code is irrelevant (error_max_turns exits 1); stop paying
          return result;
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }
  return result;
}

type Row = { c: Case; fired: (string | null)[]; pass: boolean; cost: number };

async function evalCase(c: Case): Promise<Row> {
  const fired: (string | null)[] = [];
  let cost = 0;
  for (let i = 0; i < runs; i++) {
    const r = await runOnce(c.prompt);
    if (!r.loaded) throw new Error("claude did not list the project skills in its init event; the eval would be meaningless");
    fired.push(r.fired);
    cost += r.cost;
  }
  // Positive: expected skill fires in >= 2/3 of runs. Negative: no project skill fires in more than 1/3 of runs.
  if ("skill" in c.expect) {
    const expected = c.expect.skill;
    const hits = fired.filter((f) => f === expected).length;
    return { c, fired, pass: hits >= Math.ceil((2 * runs) / 3), cost };
  }
  const hits = fired.filter((f) => f && projectSkills.has(f)).length;
  return { c, fired, pass: hits <= Math.floor(runs / 3), cost };
}

console.log(`claude ${version} | model ${model} | ${cases.length} cases x ${runs} runs | concurrency ${concurrency}\n`);
const rows: Row[] = [];
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(concurrency, cases.length) }, async () => {
    while (next < cases.length) {
      const c = cases[next++]!;
      const row = await evalCase(c);
      rows.push(row);
      console.log(`${row.pass ? "PASS" : "FAIL"}  ${c.id}`);
    }
  }),
);

rows.sort((a, b) => cases.indexOf(a.c) - cases.indexOf(b.c));
console.log("\nresult  case                      expected          fired (per run)");
for (const r of rows) {
  const exp = "skill" in r.c.expect ? r.c.expect.skill : "(no project skill)";
  const fired = r.fired.map((f) => f ?? "-").join(", ");
  console.log(`${r.pass ? "PASS" : "FAIL"}    ${r.c.id.padEnd(24)}  ${exp.padEnd(16)}  ${fired}${r.c.near_miss ? "  [near miss]" : ""}`);
}
const failed = rows.filter((r) => !r.pass);
const total = rows.reduce((n, r) => n + r.cost, 0);
console.log(`\n${rows.length - failed.length}/${rows.length} passed, about $${total.toFixed(2)} reported by claude`);
console.log("Positive runs stop at the first skill call before a cost is reported, so the total undercounts: budget $0.05-0.10 per run on sonnet.");

const outDir = join(import.meta.dir, "results");
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(
  file,
  JSON.stringify(
    {
      claudeVersion: version,
      model,
      runs,
      totalCostUsd: total,
      rows: rows.map((r) => ({ id: r.c.id, prompt: r.c.prompt, expect: r.c.expect, fired: r.fired, pass: r.pass, costUsd: r.cost })),
    },
    null,
    2,
  ),
);
console.log(`report: ${file.slice(root.length + 1)}`);
process.exit(failed.length ? 1 : 0);
