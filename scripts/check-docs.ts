#!/usr/bin/env bun
/// <reference types="node" />
/**
 * Drift check: do the docs still describe the repo? No model, no network, no dependencies.
 * Usage: bun scripts/check-docs.ts [repoRoot] [--strict]
 *   exit 1 on any error; warnings fail only with --strict.
 *
 * Checks: `bun run <script>` exists in package.json; backtick-quoted paths exist; the Layout block
 * in AGENTS.md exists on disk; every agent file is documented; every skill named in the docs exists;
 * CLAUDE.md/GEMINI.md import AGENTS.md; stack versions and env vars match the code; the e2e build mode
 * (APP_ID, DEV_CLIENT_SCHEME) matches app.config.ts; every MCP config file lists the same servers; .gitattributes exists.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const root = resolve(args.find((a) => !a.startsWith("--")) ?? process.cwd());

type Finding = { level: "error" | "warn"; file: string; msg: string };
const findings: Finding[] = [];
const err = (file: string, msg: string) => findings.push({ level: "error", file, msg });
const warn = (file: string, msg: string) => findings.push({ level: "warn", file, msg });

const at = (...p: string[]) => join(root, ...p);
const read = (p: string) => readFileSync(p, "utf8");
const readIf = (rel: string) => (existsSync(at(rel)) ? read(at(rel)) : null);

// Paths that docs may name although they are generated, gitignored, local-only, or created by the reader.
const MISSING_PATH_OK = new Set([
  "ios", "android", "expo-env.d.ts", "src/uniwind-types.d.ts", ".env", ".env.local", ".expo", "node_modules",
  "dist", "specs/steering", "specs", "LICENSE",
  "SKILL.md", // generic file name used in prose, not a root file
]);
// Root-level or top-level names that make a backtick token count as a repo path.
const PATH_ROOTS = ["src", ".claude", ".github", ".eas", "e2e", "scripts", "specs", "assets", "evals", "licenses", "ios", "android"];
const ROOT_FILE = /^[\w.-]+\.(md|json|js|yml|yaml|lock)$|^[\w-]+\.config\.ts$|^\.env(\.example)?$|^LICENSE$/;

const docs = [
  "README.md", "AGENTS.md", "CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md",
  "specs/README.md", "specs/_template.md", "THIRD_PARTY_NOTICES.md",
].filter((f) =>
  existsSync(at(f)),
);
const text: Record<string, string> = Object.fromEntries(docs.map((f) => [f, read(at(f))]));

const pkgRaw = readIf("package.json");
if (!pkgRaw) {
  console.error("package.json not found in " + root);
  process.exit(2);
}
const pkg = JSON.parse(pkgRaw) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const scripts = new Set(Object.keys(pkg.scripts ?? {}));
const dep = (name: string) => pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];

const listDirs = (rel: string) =>
  existsSync(at(rel)) ? readdirSync(at(rel)).filter((n) => statSync(at(rel, n)).isDirectory()) : [];
const ownDocFiles = (): string[] => {
  const files = [...docs];
  for (const s of listDirs(".claude/skills")) if (existsSync(at(".claude/skills", s, "SKILL.md"))) files.push(`.claude/skills/${s}/SKILL.md`);
  if (existsSync(at(".claude/agents")))
    for (const a of readdirSync(at(".claude/agents"))) if (a.endsWith(".md")) files.push(`.claude/agents/${a}`);
  return files;
};

const sources = readIf(".claude/skills/SOURCES.md") ?? "";
const vendored = new Set<string>();
for (const row of sources.split("\n")) {
  const first = row.match(/^\|\s*([^|]+?)\s*\|/)?.[1];
  if (!first || /^(Skill|-+)$/.test(first)) continue;
  for (const n of first.split(",")) vendored.add(n.trim());
}
const allSkills = listDirs(".claude/skills").filter((s) => s !== "THIRD_PARTY");
const ownSkills = allSkills.filter((s) => !vendored.has(s));
const agentNames = existsSync(at(".claude/agents"))
  ? readdirSync(at(".claude/agents")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3))
  : [];

// 1. Commands: every `bun run <name>` and `bun scripts/<file>` must resolve.
for (const f of ownDocFiles()) {
  const t = f in text ? text[f] ?? "" : read(at(f));
  for (const m of t.matchAll(/\bbun run ([A-Za-z0-9][\w:.-]*)/g)) {
    const name = m[1] ?? "";
    if (!scripts.has(name)) err(f, `\`bun run ${name}\` but package.json has no "${name}" script`);
  }
  for (const m of t.matchAll(/\bbun (scripts\/[\w./-]+\.(?:ts|js))/g)) {
    if (!existsSync(at(m[1] ?? ""))) err(f, `\`bun ${m[1]}\` but that file does not exist`);
  }
  for (const m of t.matchAll(/`bun test(?:\s[^`]*)?`/g)) {
    err(f, `${m[0]} runs Bun's own runner, not Jest; the script is \`bun run test\``);
  }
}

// 2. Paths in backticks, README/AGENTS/CLAUDE/GEMINI only (skills use illustrative paths on purpose).
function looksLikePath(tok: string): boolean {
  if (/[*<>{}$|\s]/.test(tok) || tok.includes("...")) return false;
  const first = tok.split("/")[0] ?? "";
  if (tok.includes("/")) return PATH_ROOTS.includes(first);
  return ROOT_FILE.test(tok);
}
function checkPath(file: string, raw: string) {
  const tok = raw.replace(/:\d+(-\d+)?$/, "").replace(/\/+$/, "");
  if (!tok || !looksLikePath(tok) || MISSING_PATH_OK.has(tok)) return;
  if ([...MISSING_PATH_OK].some((p) => tok === p || tok.startsWith(p + "/")) && !existsSync(at(tok))) return;
  // A bare name in a nested doc (specs/README.md) may be relative to that doc.
  if (!existsSync(at(tok)) && !existsSync(at(dirname(file), tok))) err(file, `path \`${tok}\` is named in the docs but does not exist`);
}
for (const f of docs) {
  for (const m of (text[f] ?? "").matchAll(/`([^`\n]+)`/g)) checkPath(f, m[1] ?? "");
}

// 3. The Layout code block in AGENTS.md: each column that starts with a path must exist.
{
  const t = text["AGENTS.md"];
  const block = t?.match(/^## Layout\s*\n+```[^\n]*\n([\s\S]*?)\n```/m)?.[1];
  if (t && !block) warn("AGENTS.md", "no `## Layout` code block found; layout drift is unchecked");
  for (const line of (block ?? "").split("\n")) {
    line.split(/\s{2,}/).forEach((seg, i) => {
      // Later columns are prose; only the first column or an explicit directory path is a layout entry.
      if (i > 0 && !seg.trim().split(/\s+/)[0]?.includes("/")) return;
      const tok = seg.trim().split(/\s+/)[0] ?? "";
      const isPath = /^[.\w()@-]+(\/[.\w()@-]*)*\/?$/.test(tok) && (tok.includes("/") || /\.\w+$/.test(tok));
      if (!isPath) return;
      const clean = tok.replace(/\/+$/, "");
      if (!existsSync(at(clean)) && !MISSING_PATH_OK.has(clean)) err("AGENTS.md", `Layout lists \`${tok}\` but it does not exist`);
    });
  }
}

// 4. Inventory: agents documented, skills named in docs exist, own skills documented.
{
  const registry = (text["AGENTS.md"] ?? "") + (text["CLAUDE.md"] ?? "");
  for (const a of agentNames) {
    if (!registry.includes("`" + a + "`")) err("AGENTS.md", `agent \`${a}\` exists in .claude/agents but is not named in AGENTS.md or CLAUDE.md`);
  }
  for (const s of ownSkills) {
    if (!registry.includes("`" + s + "`") && !registry.includes("`" + s + "/") ) {
      warn("AGENTS.md", `own skill \`${s}\` is not named in AGENTS.md or CLAUDE.md`);
    }
    if (sources && !sources.includes(s)) warn(".claude/skills/SOURCES.md", `own skill \`${s}\` is not in its "authored for this template" sentence`);
  }
  for (const v of vendored) {
    if (!allSkills.includes(v)) err(".claude/skills/SOURCES.md", `lists vendored skill \`${v}\` but the folder does not exist`);
  }
  for (const m of sources.matchAll(/Everything not listed here \(([^)]*)\)/g)) {
    for (const n of (m[1] ?? "").split(",").map((s) => s.replace(/`/g, "").trim()).filter(Boolean)) {
      if (!allSkills.includes(n)) err(".claude/skills/SOURCES.md", `says \`${n}\` is authored here but the folder does not exist`);
    }
  }
  for (const f of ["README.md", "AGENTS.md", "CLAUDE.md"]) {
    const m = (text[f] ?? "").match(/(\d+) pinned upstream skills/);
    if (m && Number(m[1]) !== vendored.size) err(f, `says ${m[1]} pinned upstream skills but SOURCES.md lists ${vendored.size}`);
  }
  // A backticked token that is clearly a skill or agent reference must resolve.
  const known = new Set([...allSkills, ...agentNames]);
  for (const f of ["AGENTS.md", "CLAUDE.md"]) {
    for (const m of (text[f] ?? "").matchAll(/`\.claude\/(skills|agents)\/([\w-]+)(?:\/SKILL\.md|\.md)?`/g)) {
      if (m[2] === "SOURCES") continue;
      if (!known.has(m[2] ?? "")) err(f, `references .claude/${m[1]}/${m[2]} which does not exist`);
    }
  }
}

// 5. One source of truth: CLAUDE.md and GEMINI.md import AGENTS.md first.
for (const f of ["CLAUDE.md", "GEMINI.md"]) {
  if (!(f in text)) continue;
  const first = (text[f] ?? "").split("\n").find((l) => l.trim() !== "");
  if (first?.trim() !== "@AGENTS.md") err(f, "must start with `@AGENTS.md` so AGENTS.md stays the single source of truth");
}

// 6. Versions and env vars named in prose must match the code.
{
  const major = (v: string | undefined) => v?.replace(/^[^\d]*/, "").split(".")[0];
  const minor = (v: string | undefined) => v?.replace(/^[^\d]*/, "").split(".").slice(0, 2).join(".");
  const expoMajor = major(dep("expo"));
  const rnMinor = minor(dep("react-native"));
  const reactMinor = minor(dep("react"));
  for (const f of docs) {
    const t = text[f] ?? "";
    for (const m of t.matchAll(/Expo SDK (\d+)/g)) if (expoMajor && m[1] !== expoMajor) err(f, `says Expo SDK ${m[1]} but package.json has expo ${dep("expo")}`);
    for (const m of t.matchAll(/React Native (\d+\.\d+)/g)) if (rnMinor && m[1] !== rnMinor) err(f, `says React Native ${m[1]} but package.json has ${dep("react-native")}`);
    for (const m of t.matchAll(/React (19\.\d+)/g)) if (reactMinor && m[1] !== reactMinor) err(f, `says React ${m[1]} but package.json has react ${dep("react")}`);
  }
  const ci = readIf(".github/workflows/ci.yml");
  // CI reads `.node-version` (node-version-file); fall back to an inline `node-version:`.
  const nodeCi = readIf(".node-version")?.trim().match(/^v?(\d+)/)?.[1] ?? ci?.match(/node-version:\s*["']?(\d+)/)?.[1];
  const bunCi = ci?.match(/bun-version:\s*["']?(\d+)\.(\d+)/);
  for (const f of docs) {
    const t = text[f] ?? "";
    for (const m of t.matchAll(/\bNode (\d+)\b/g)) if (nodeCi && m[1] !== nodeCi) err(f, `says Node ${m[1]} but CI uses Node ${nodeCi}`);
    for (const m of t.matchAll(/bun ≥ (\d+)\.(\d+)/g)) {
      if (bunCi && (Number(m[1]) > Number(bunCi[1]) || (Number(m[1]) === Number(bunCi[1]) && Number(m[2]) > Number(bunCi[2])))) {
        err(f, `requires bun ≥ ${m[1]}.${m[2]} but CI pins bun ${bunCi[1]}.${bunCi[2]}`);
      }
    }
  }
  const envSources = (readIf("src/config/env.ts") ?? "") + (readIf(".env.example") ?? "");
  for (const f of docs) {
    for (const m of new Set((text[f] ?? "").match(/EXPO_PUBLIC_[A-Z0-9]+(?:_[A-Z0-9]+)*/g) ?? [])) {
      if (!envSources.includes(m)) err(f, `names env var ${m} but it is not in src/config/env.ts or .env.example`);
    }
  }
}

// 7. Reverse: package.json scripts nobody documented (warning only: some are internal).
{
  const documented = (text["README.md"] ?? "") + (text["AGENTS.md"] ?? "") + (text["CLAUDE.md"] ?? "");
  for (const s of scripts) {
    if (!documented.includes(s)) warn("package.json", `script "${s}" is not mentioned in README.md, AGENTS.md or CLAUDE.md`);
  }
}

// 8. e2e/support/build-mode.ts must agree with app.config.ts: dev app id and dev-client scheme.
{
  const cfg = readIf("app.config.ts");
  const mode = readIf("e2e/support/build-mode.ts");
  if (cfg && mode) {
    const baseId = cfg.match(/const BASE_ID\s*=\s*['"]([^'"]+)['"]/)?.[1];
    const slug = cfg.match(/\bslug:\s*['"]([^'"]+)['"]/)?.[1];
    const appId = mode.match(/export const APP_ID\s*=[^;]*?\?\?\s*['"]([^'"]+)['"]/)?.[1];
    const scheme = mode.match(/export const DEV_CLIENT_SCHEME\s*=\s*['"]([^'"]+)['"]/)?.[1];
    const f = "e2e/support/build-mode.ts";
    if (!baseId || !slug) err("app.config.ts", "could not parse BASE_ID or slug; the e2e build-mode check is skipped");
    else {
      if (!appId) err(f, "could not parse APP_ID");
      else if (appId !== `${baseId}.dev`) err(f, `APP_ID is ${appId} but app.config.ts BASE_ID gives ${baseId}.dev`);
      if (!scheme) err(f, "could not parse DEV_CLIENT_SCHEME");
      else if (scheme !== `exp+${slug}`) err(f, `DEV_CLIENT_SCHEME is ${scheme} but app.config.ts slug gives exp+${slug}`);
    }
  }
}

// 9. Every agent's MCP config must list the same servers (.mcp.json is the reference).
{
  const names = (rel: string, parse: (raw: string) => string[]): [string, string[]] | null => {
    const raw = readIf(rel);
    if (raw === null) return null;
    try {
      return [rel, parse(raw).sort()];
    } catch {
      err(rel, "could not be parsed; the MCP server parity check is skipped for it");
      return null;
    }
  };
  // JSONC allowed (whole-line // comments only, so URLs survive).
  const json = (raw: string) => JSON.parse(raw.replace(/^\s*\/\/.*$/gm, "")) as Record<string, Record<string, unknown> | undefined>;
  const configs = [
    names(".mcp.json", (r) => Object.keys(json(r).mcpServers ?? {})),
    names(".cursor/mcp.json", (r) => Object.keys(json(r).mcpServers ?? {})),
    names(".vscode/mcp.json", (r) => Object.keys(json(r).servers ?? {})),
    names(".gemini/settings.json", (r) => Object.keys(json(r).mcpServers ?? {})),
    names(".codex/config.toml", (r) => [
      ...new Set([...r.matchAll(/^\[mcp_servers\.(?:"([^"]+)"|([\w-]+))(?:\.[^\]]*)?\]/gm)].map((m) => m[1] ?? m[2] ?? "")),
    ]),
  ].filter((c): c is [string, string[]] => c !== null);
  const [ref, ...rest] = configs;
  for (const [file, servers] of rest) {
    if (ref && servers.join() !== ref[1].join()) {
      err(file, `MCP servers [${servers.join(", ")}] differ from ${ref[0]} [${ref[1].join(", ")}]`);
    }
  }
}

// 10. CRLF checkouts on Windows break shell scripts; .gitattributes pins line endings.
if (!existsSync(at(".gitattributes"))) err(".gitattributes", "missing; Windows checkouts would convert line endings");

const errors = findings.filter((f) => f.level === "error");
const warnings = findings.filter((f) => f.level === "warn");
for (const f of [...errors, ...warnings]) console.log(`${f.level.toUpperCase().padEnd(5)} ${f.file}: ${f.msg}`);
console.log(`check-docs: ${errors.length} error(s), ${warnings.length} warning(s), ${docs.length} doc file(s) scanned`);
process.exit(errors.length > 0 || (strict && warnings.length > 0) ? 1 : 0);
