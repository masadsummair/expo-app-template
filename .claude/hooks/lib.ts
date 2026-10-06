// Shared helpers for the Claude Code hooks in this folder. Runs on bun, so the hooks work the same on
// macOS, Linux and Windows (no bash, no jq). Guardrails against mistakes and prompt injection, not a sandbox.
import { posix } from 'node:path';

export type Decision = { decision: 'deny' | 'ask'; reason: string };
export type HookInput = { tool_name?: string; tool_input?: Record<string, unknown> };

/** Backslashes to slashes; `C:\x` to `/c/x` so Windows, Git Bash and POSIX paths compare the same way. */
export function toPosix(p: string): string {
  const s = p.replace(/\\/g, '/');
  const drive = /^([a-zA-Z]):(\/|$)/.exec(s);
  return drive ? `/${(drive[1] ?? '').toLowerCase()}${s.slice(2)}` : s;
}

function stripTrailingSlash(s: string): string {
  return s.length > 1 ? s.replace(/\/+$/, '') || '/' : s;
}

/** Absolute, normalised (`..` resolved) posix-style path; relative input resolves against `base`. */
export function resolvePath(p: string, base: string): string {
  const s = toPosix(p);
  return stripTrailingSlash(posix.normalize(s.startsWith('/') ? s : posix.join(toPosix(base), s)));
}

/** Path relative to the project root, or null when it is outside it (or unresolved like `~/x`). */
export function relativeToRoot(p: string, root: string): string | null {
  if (/^[~$]/.test(p)) return null;
  const abs = resolvePath(p, root);
  const r = stripTrailingSlash(toPosix(root));
  if (abs.toLowerCase() === r.toLowerCase()) return '';
  return abs.toLowerCase().startsWith(`${r.toLowerCase()}/`) ? abs.slice(r.length + 1) : null;
}

/** Last path segment, still holding any `HEAD:`, `C:` or NTFS `:stream` parts (`isEnvName` checks each). */
export function baseName(p: string): string {
  return p.split(/[\\/]/).pop() ?? '';
}

/**
 * `.env`, `.env.local`, `.ENV`, globs like `.env*` or `.e*`; `.env.example` and `.env.d.ts` are fine.
 * Win32 drops trailing dots and spaces, `:stream` and `::$DATA` open the same file, and `ENV~1` is its 8.3 alias.
 */
export function isEnvName(name: string): boolean {
  return name.split(':').some(isEnvPart);
}

function isEnvPart(part: string): boolean {
  const b = part.toLowerCase().replace(/[. ]+$/, '');
  if (/^env~\d+(\.[a-z0-9]{0,3})?$/.test(b)) return true;
  const glob = b.search(/[*?[]/);
  if (glob !== -1) {
    const prefix = b.slice(0, glob);
    return prefix.length > 0 && ('.env'.startsWith(prefix) || prefix.startsWith('.env')) && !prefix.startsWith('.env.example');
  }
  return /^\.env(\.[a-z0-9_-]+)*$/.test(b) && b !== '.env.example' && !b.endsWith('.d.ts');
}

/** Glob to RegExp (`*`, `?`, `[a-z]`, `{a,b}`); a glob it cannot parse matches everything, the safe side. */
export function globMatches(glob: string, name: string): boolean {
  let re = '';
  let braces = 0;
  for (const c of glob) {
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else if (c === '{') {
      re += '(?:';
      braces++;
    } else if (c === '}' && braces) {
      re += ')';
      braces--;
    } else if (c === ',' && braces) re += '|';
    else if (c === '[' || c === ']') re += c;
    else re += c.replace(/[.+^$()|\\]/, '\\$&');
  }
  try {
    return new RegExp(`^${re}${')'.repeat(braces)}$`, 'i').test(name);
  } catch {
    return true;
  }
}

// What a sweep has to skip: every one of these must be excluded, `--exclude=.env` alone still prints `.env.local`.
export const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.development'];

const ENV_MESSAGE = (rel: string) =>
  `Access to ${rel} blocked, it may contain secrets. Use .env.example for variable names.`;

// Case-insensitive on purpose: macOS and Windows file systems treat `Package.json` and `package.json` as one file.
const EXECUTED_BY_AUTO_APPROVED =
  /^(package\.json|bun\.lock|jest\.config\.js|eslint\.config\.js|metro\.config\.js|babel\.config\.js|app\.config\.ts|eas\.json|scripts|evals|\.github|\.git\/hooks|\.claude\/(agents|skills))(\/|$)/i;
// Tool configs and test scaffolding that other agents' tools, installs or the test runner load and execute.
const TOOL_CONFIG = /^(\.(vscode|codex|gemini|cursor)|e2e)(\/|$)|^test\/setup\.ts$|(^|\/)(bunfig\.toml|\.npmrc|tsconfig[^/]*\.json)$/i;

// Slash commands carry allowed-tools and shell injection; the ignore files are the secret-hiding control for Cursor and Gemini.
const AGENT_CONTROL =
  /^(\.claude|\.agents|\.husky)(\/|$)|^(claude\.md|gemini\.md|\.cursorignore|\.geminiignore|\.fingerprintignore|\.?lefthook(-local)?\.ya?ml)$/i;

/** Decision for touching `path`. `read` only checks secrets; `write` also checks protected files. */
export function classifyPath(access: 'read' | 'write', path: string, root: string): Decision | null {
  const raw = relativeToRoot(path, root);
  const label = raw ?? path;
  const rel = raw === null ? null : raw.split('/').map((seg) => seg.split(':')[0]?.replace(/[. ]+$/, '') ?? '').join('/');
  if (isEnvName(baseName(path))) return { decision: 'deny', reason: ENV_MESSAGE(label) };
  if (access === 'read' || rel === null) return null;

  // Continuous Native Generation: ios/ and android/ are generated by prebuild and gitignored.
  if (/^(ios|android)(\/|$)/i.test(rel)) {
    return {
      decision: 'deny',
      reason: 'ios/ and android/ are generated (CNG) and overwritten by prebuild. Change native behaviour in app.config.ts or a config plugin instead.',
    };
  }
  if (rel.split('/').some((seg) => /^[^.]{1,6}~\d+(\.[a-z0-9]{0,3})?$/i.test(seg))) {
    return { decision: 'ask', reason: `${label} looks like a Windows 8.3 short name, which can alias a protected file. Use the long name.` };
  }
  // The agent must not silently rewrite its own guardrails or permissions.
  if (/^\.claude\/(hooks(\/|$)|settings)/i.test(rel) || rel.toLowerCase() === '.mcp.json' || /^\.cursor\//i.test(rel)) {
    return { decision: 'ask', reason: `Editing ${rel} changes an agent's own hooks, permissions, or MCP servers. Confirm this is intended.` };
  }
  // e2e.config.ts spawns processes (app.command) whenever e2e runs: treat it like executable config.
  if (rel.toLowerCase() === 'e2e.config.ts') {
    return { decision: 'ask', reason: 'Editing e2e.config.ts changes what the e2e runner executes (it spawns app.command). Confirm this is intended.' };
  }
  if (EXECUTED_BY_AUTO_APPROVED.test(rel)) {
    return { decision: 'ask', reason: `${rel} is executed by auto-approved commands (bun run verify, install, CI). Confirm this edit is intended.` };
  }
  if (TOOL_CONFIG.test(rel)) {
    return { decision: 'ask', reason: `${rel} configures tools, installs or tests that run with auto-approved commands or other agents. Confirm this edit is intended.` };
  }
  if (AGENT_CONTROL.test(rel)) {
    return { decision: 'ask', reason: `${rel} steers other agents or hides secrets from them (commands, rules, instructions, ignore files, git hooks). Confirm this edit is intended.` };
  }
  return null;
}

export function projectRoot(): string {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(2); // Only exit 2 blocks; any other failure would let the tool call through.
}

/** Reads the hook JSON from stdin, runs `handler`, prints its decision. Fails closed (exit 2) on any error. */
export async function runHook(handler: (input: HookInput) => Decision | null): Promise<void> {
  let input: HookInput;
  try {
    input = JSON.parse(await Bun.stdin.text()) as HookInput;
  } catch {
    fail('Claude Code hook could not read its JSON input.');
  }
  let decision: Decision | null;
  try {
    decision = handler(input);
  } catch (error) {
    fail(`Claude Code hook crashed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (decision) {
    process.stdout.write(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: decision.decision,
          permissionDecisionReason: decision.reason,
        },
      })}\n`,
    );
  }
}
