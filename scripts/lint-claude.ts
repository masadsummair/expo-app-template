#!/usr/bin/env bun
/**
 * Structural lint for .claude/ (skills + agents). No model, no network, no dependencies.
 * Usage: bun scripts/lint-claude.ts [repoRoot]   (exit 1 on any error, warnings never fail)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
const claudeDir = join(root, ".claude");

const SKILL_KEYS = new Set([
  "name", "description", "when_to_use", "argument-hint", "arguments", "disable-model-invocation",
  "user-invocable", "paths", "context", "background", "agent", "allowed-tools", "disallowed-tools",
  "model", "effort", "hooks", "shell", "metadata", "license", "compatibility", "version",
]);
const AGENT_KEYS = new Set([
  "name", "description", "tools", "disallowedTools", "model", "color", "permissionMode", "skills",
  "mcpServers", "hooks", "maxTurns", "memory", "background", "effort", "isolation", "initialPrompt",
]);
const BASE_TOOLS = new Set([
  "Read", "Grep", "Glob", "Bash", "PowerShell", "Edit", "Write", "NotebookEdit", "WebFetch",
  "WebSearch", "LSP", "Skill", "Agent", "SendMessage", "TodoWrite", "ToolSearch", "Monitor",
  "Artifact", "EnterWorktree", "ExitWorktree", "SubagentHandoff",
]);
const NEVER_IN_SUBAGENTS = new Set(["AskUserQuestion", "EnterPlanMode", "ExitPlanMode", "Workflow"]);
const AGENT_MODELS = new Set(["sonnet", "opus", "haiku", "fable", "inherit"]);
const AGENT_COLORS = new Set(["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]);
const PERMISSION_MODES = new Set(["default", "acceptEdits", "auto", "dontAsk", "bypassPermissions", "plan", "manual"]);

const DESC_HARD = 1536; // Claude Code cap on description + when_to_use
const DESC_PORTABLE = 1024; // agentskills.io spec
const MAX_LINES = 500;

// Vendored skills that legitimately exceed a limit. Keep empty unless a limit is hit; explain each entry.
const VENDORED_ALLOWLIST: Record<string, string[]> = {};

type Finding = { level: "error" | "warn"; file: string; msg: string };
const findings: Finding[] = [];
const err = (file: string, msg: string) => findings.push({ level: "error", file, msg });
const warn = (file: string, msg: string) => findings.push({ level: "warn", file, msg });

const rel = (p: string) => p.slice(root.length + 1);
const read = (p: string) => readFileSync(p, "utf8");

function parseFrontmatter(path: string, text: string): { data: Record<string, unknown>; body: string } | null {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) {
    err(rel(path), "no closed `---` frontmatter block");
    return null;
  }
  try {
    const data = Bun.YAML.parse(m[1] ?? "");
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      err(rel(path), "frontmatter is not a YAML mapping");
      return null;
    }
    return { data: data as Record<string, unknown>, body: m[2] ?? "" };
  } catch (e) {
    err(rel(path), `frontmatter is not valid YAML (${(e as Error).message}); Claude Code would load it with empty metadata`);
    return null;
  }
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

function dirs(p: string) {
  return existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : [];
}

/** Skill names listed as vendored in .claude/skills/SOURCES.md table rows. */
function vendoredNames(skillDirs: string[]): Set<string> {
  const src = join(claudeDir, "skills", "SOURCES.md");
  const out = new Set<string>();
  if (!existsSync(src)) return out;
  for (const line of read(src).split("\n")) {
    if (!line.startsWith("|")) continue;
    const firstCell = line.split("|")[1] ?? "";
    for (const name of skillDirs) if (new RegExp(`(^|[\\s,\`])${name}([\\s,\`]|$)`).test(firstCell)) out.add(name);
  }
  return out;
}

// ---------- skills ----------
const skillsDir = join(claudeDir, "skills");
const skillDirs = dirs(skillsDir).filter((d) => d !== "THIRD_PARTY");
const vendored = vendoredNames(skillDirs);
const skillNames = new Set<string>();
const ownDescriptions: [string, Set<string>][] = [];

for (const dir of skillDirs) {
  const path = join(skillsDir, dir, "SKILL.md");
  if (!existsSync(path)) {
    err(rel(join(skillsDir, dir)), "folder has no SKILL.md");
    continue;
  }
  const text = read(path);
  const fm = parseFrontmatter(path, text);
  if (!fm) continue;
  const { data, body } = fm;
  const isVendored = vendored.has(dir);
  const allow = VENDORED_ALLOWLIST[dir] ?? [];
  const hard = (id: string, msg: string) => {
    if (!allow.includes(id)) err(rel(path), msg);
  };

  const name = data.name;
  if (typeof name !== "string" || !name) hard("name", "missing `name`");
  else {
    skillNames.add(name);
    if (name !== dir) hard("name-folder", `name "${name}" does not match folder "${dir}"`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64)
      hard("name-format", `name "${name}" must be lowercase letters, digits, single hyphens, max 64 chars`);
  }

  const desc = data.description;
  if (typeof desc !== "string" || !desc.trim()) hard("description", "missing `description`");
  else {
    const total = desc.length + (typeof data.when_to_use === "string" ? data.when_to_use.length : 0);
    if (total > DESC_HARD) hard("description-length", `description + when_to_use is ${total} chars (Claude Code cap ${DESC_HARD})`);
    else if (total > DESC_PORTABLE) warn(rel(path), `description is ${total} chars (agentskills.io portable limit ${DESC_PORTABLE})`);
  }

  const lines = text.split("\n").length;
  if (lines > MAX_LINES) hard("lines", `SKILL.md is ${lines} lines (limit ${MAX_LINES}); move detail into references/`);

  if (!isVendored) {
    for (const k of Object.keys(data)) if (!SKILL_KEYS.has(k)) err(rel(path), `unknown frontmatter key "${k}"`);
    if (typeof desc === "string") {
      if (!/\buse\b/i.test(desc)) err(rel(path), 'description must say when to use the skill ("Use when ...")');
      if (desc.length > 600) warn(rel(path), `description is ${desc.length} chars; the first 250 must carry the trigger`);
      ownDescriptions.push([dir, words(desc)]);
    }
    if (!/do not use|don'?t use|not for|when not to use|not a substitute/i.test(`${desc ?? ""}\n${body}`))
      warn(rel(path), 'should say when NOT to use it (a "## When not to use" section or a "Do not use ..." line)');
  }

  // Links to files inside the skill folder must exist (warning only for vendored: upstream breakage is not ours).
  for (const m of body.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)(?:#[^)]*)?\)/g)) {
    const target = m[1] ?? "";
    if (!existsSync(join(skillsDir, dir, target))) {
      (isVendored ? warn : err)(rel(path), `broken relative link: ${target}`);
    }
  }
}

for (let i = 0; i < ownDescriptions.length; i++) {
  for (let j = i + 1; j < ownDescriptions.length; j++) {
    const [a, wa] = ownDescriptions[i]!;
    const [b, wb] = ownDescriptions[j]!;
    const sim = jaccard(wa, wb);
    if (sim > 0.6) warn(".claude/skills", `descriptions of "${a}" and "${b}" overlap (Jaccard ${sim.toFixed(2)}); expect misrouting`);
  }
}

// ---------- agents ----------
const agentsDir = join(claudeDir, "agents");
const mcpServers = new Set<string>();
const mcpPath = join(root, ".mcp.json");
if (existsSync(mcpPath)) {
  try {
    for (const k of Object.keys(JSON.parse(read(mcpPath)).mcpServers ?? {})) mcpServers.add(k);
  } catch {
    err(".mcp.json", "not valid JSON");
  }
}
const agentNames = new Set<string>();
const agentFiles = existsSync(agentsDir) ? readdirSync(agentsDir).filter((f) => f.endsWith(".md")) : [];

for (const file of agentFiles) {
  const path = join(agentsDir, file);
  const fm = parseFrontmatter(path, read(path));
  if (!fm) continue;
  const { data } = fm;
  const r = rel(path);
  const stem = file.replace(/\.md$/, "");

  for (const k of Object.keys(data)) if (!AGENT_KEYS.has(k)) err(r, `unknown frontmatter key "${k}"`);
  const name = data.name;
  if (typeof name !== "string" || !name) err(r, "missing `name` (Claude Code silently skips the agent)");
  else {
    agentNames.add(name);
    if (name.startsWith("-") || name.includes(":")) err(r, `name "${name}" must not start with "-" or contain ":"`);
    if (name !== stem) err(r, `name "${name}" does not match file name "${stem}.md"`);
  }
  const desc = data.description;
  if (typeof desc !== "string" || !desc.trim()) err(r, "missing `description` (Claude Code silently skips the agent)");
  else {
    if (!/\buse\b/i.test(desc)) err(r, 'description must say when to use the agent ("Use when/before ...")');
    if (!/\bnot\b|\bskip\b|\bnever\b/i.test(desc)) warn(r, "description does not say when NOT to use the agent");
  }

  const toolsRaw = data.tools;
  const tools =
    typeof toolsRaw === "string" ? toolsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : Array.isArray(toolsRaw) ? toolsRaw.map(String)
    : null;
  if (!tools) err(r, "missing `tools`; an agent without it inherits every tool (least privilege: list them)");
  else {
    for (const t of tools) {
      const base = t.replace(/\(.*\)$/, "");
      if (NEVER_IN_SUBAGENTS.has(base)) err(r, `tool "${t}" is never available to subagents`);
      else if (BASE_TOOLS.has(base) || /^(Task|Cron)[A-Za-z]*$/.test(base)) continue;
      else if (base.startsWith("mcp__")) {
        const server = base.split("__")[1] ?? "";
        if (!mcpServers.has(server)) err(r, `tool "${t}" references MCP server "${server}" which is not in .mcp.json`);
      } else err(r, `unknown tool "${t}"`);
    }
    if (/review|audit/i.test(`${name}`) && tools.some((t) => t === "Edit" || t === "Write"))
      err(r, "reviewer/auditor agents must not have Edit or Write (least privilege)");
  }

  if (tools?.includes("Bash") && /review|audit/i.test(`${name}`) && !/read-only git/i.test(fm.body))
    warn(r, 'reviewer/auditor has Bash but no "read-only git commands only" sentence (scoped Bash(...) in `tools` is unsupported)');

  if (typeof data.model !== "string") err(r, "missing `model`");
  else if (!AGENT_MODELS.has(data.model) && !/^claude-/.test(data.model)) err(r, `invalid model "${data.model}"`);
  if (data.color !== undefined && !AGENT_COLORS.has(String(data.color))) err(r, `invalid color "${data.color}"`);
  if (data.permissionMode !== undefined && !PERMISSION_MODES.has(String(data.permissionMode)))
    err(r, `invalid permissionMode "${data.permissionMode}"`);
  if (data.skills !== undefined) {
    const list = Array.isArray(data.skills) ? data.skills.map(String) : String(data.skills).split(",").map((s) => s.trim());
    for (const s of list) if (!skillNames.has(s)) err(r, `skills: "${s}" does not exist in .claude/skills`);
  }
}

// ---------- cross-references and banned commands ----------
const claudeFiles: string[] = [];
(function walk(p: string) {
  if (!existsSync(p)) return;
  for (const n of readdirSync(p)) {
    const full = join(p, n);
    if (statSync(full).isDirectory()) {
      if (n === "THIRD_PARTY" || vendored.has(n)) continue;
      walk(full);
    } else if (/\.(md|json)$/.test(n) && n !== "SOURCES.md") claudeFiles.push(full);
  }
})(claudeDir);

const packageJson = existsSync(join(root, "package.json")) ? JSON.parse(read(join(root, "package.json"))) : {};
const hasMaestro = existsSync(join(root, ".maestro"));

for (const f of claudeFiles) {
  const text = read(f);
  const r = rel(f);
  const stripped = text.replace(/^\s*[-*]?\s*(do not|don't|never|no)\b.*$/gim, ""); // ignore prohibitions
  if (/(^|[\s`$(])(npx\s+[a-z@]|(npm|yarn|pnpm)\s+(install|add|i|run|exec|dlx|create|init|expo|eas)\b)/m.test(stripped) || /@latest\b/.test(stripped))
    warn(r, "mentions npx/npm/yarn/pnpm or @latest; the template is bun-only and pinned (guard-bash blocks these)");
  if (!hasMaestro && /maestro/i.test(text) && !f.includes("/hooks/"))
    err(r, "mentions Maestro but .maestro/ and the test:e2e script are gone; update to the e2e framework");
}

const docsDir = join(root, "docs");
const docPages = existsSync(docsDir) ? readdirSync(docsDir).filter((n) => n.endsWith(".md")).map((n) => `docs/${n}`) : [];
for (const doc of ["CLAUDE.md", "README.md", "AGENTS.md", ...docPages]) {
  const p = join(root, doc);
  if (!existsSync(p)) continue;
  for (const m of read(p).matchAll(/\.claude\/(skills|agents)\/([a-z0-9-]+)/g)) {
    const kind = m[1];
    const n = m[2] ?? "";
    const ok = kind === "skills" ? skillNames.has(n) || n === "THIRD_PARTY" : agentNames.has(n) || agentFiles.includes(`${n}.md`);
    if (!ok && n !== "") err(doc, `references .claude/${kind}/${n} which does not exist`);
  }
}

// ---------- report ----------
for (const f of findings.filter((x) => x.level === "warn")) console.warn(`warn  ${f.file}: ${f.msg}`);
for (const f of findings.filter((x) => x.level === "error")) console.error(`error ${f.file}: ${f.msg}`);
const errors = findings.filter((f) => f.level === "error").length;
console.log(
  `lint-claude: ${skillDirs.length} skills (${vendored.size} vendored), ${agentFiles.length} agents, ` +
    `${errors} error(s), ${findings.length - errors} warning(s)`,
);
process.exit(errors ? 1 : 0);
