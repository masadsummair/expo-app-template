// PreToolUse(Read|Grep|Glob|Edit|Write|MultiEdit|NotebookEdit) guard for secrets, generated native code,
// the Claude Code config itself and files that auto-approved commands execute. Guardrails, not a sandbox.
import { classifyPath, ENV_FILES, globMatches, projectRoot, runHook, type Decision, type HookInput } from './lib';

const text = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

// EXPO_PUBLIC_* values are inlined into the JS bundle in plain text. `_KEY` is not banned wholesale:
// publishable keys (Stripe publishable, Supabase anon) are meant to be public.
const PUBLIC_SECRET =
  /EXPO_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|PASSWORD|SERVICE_ROLE|TOKEN|ACCESS_KEY|SECRET_KEY|API_SECRET|OPENAI|ANTHROPIC|CREDENTIAL)/;

export function evaluateFileTool(input: HookInput, root: string = projectRoot()): Decision | null {
  const tool = input.tool_name ?? '';
  const ti = input.tool_input ?? {};
  const access = tool === 'Read' || tool === 'Grep' || tool === 'Glob' ? 'read' : 'write';

  // Read/Edit/Write use file_path; Grep uses path (+ glob); Glob uses path + pattern; NotebookEdit uses notebook_path.
  const targets = [ti.file_path, ti.path, ti.notebook_path, ti.glob, tool === 'Glob' ? ti.pattern : null]
    .map(text)
    .filter((p): p is string => p !== null);
  for (const target of targets) {
    const decision = classifyPath(access, target, root);
    if (decision) return decision;
  }

  // rg whitelists any file a --glob matches, .gitignore and hidden files included: `*`, `*.env` and `{.env,x}` read .env.
  const glob = text(ti.glob)?.replace(/^(\*\*\/|\/)+/, '');
  if (tool === 'Grep' && glob && !glob.startsWith('!') && ENV_FILES.some((n) => globMatches(glob, n))) {
    return { decision: 'deny', reason: `Grep glob "${ti.glob}" would search .env files, which may contain secrets. Use a glob such as "*.ts" or search a subfolder.` };
  }

  const edits = Array.isArray(ti.edits) ? (ti.edits as { new_string?: unknown }[]).map((e) => e?.new_string) : [];
  const content = [ti.content, ti.new_string, ti.new_source, ...edits].map(text).filter((s) => s !== null).join('\n');
  if (PUBLIC_SECRET.test(content)) {
    return {
      decision: 'deny',
      reason: 'EXPO_PUBLIC_* variables ship inside the app bundle: anyone can read them. Secrets must stay on a server; only publishable keys may use EXPO_PUBLIC_.',
    };
  }
  return null;
}

export const main = () => runHook((input) => evaluateFileTool(input));

if (import.meta.main) await main();
