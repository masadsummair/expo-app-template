// PreToolUse(Bash|PowerShell) guard. Denies commands that are destructive, bypass the team workflow,
// or read secrets. No output = no opinion (the normal permission flow applies).
// Best-effort guardrails against mistakes and prompt injection, not a sandbox: shell obfuscation
// (variable indirection, encoded payloads, scripts that run other scripts) defeats them.
import { spawnSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { resolve as nativeResolve } from 'node:path';
import { classifyPath, isEnvName, projectRoot, relativeToRoot, resolvePath, runHook, toPosix, type Decision, type HookInput } from './lib';

export type Ctx = {
  root: string;
  cwd: string;
  home: string;
  /** Current branch of the repo at `dir` ('' when unknown). */
  branch: (dir: string) => string;
};

export function defaultCtx(): Ctx {
  return {
    root: projectRoot(),
    cwd: process.cwd(),
    home: homedir(),
    branch: (dir) => {
      const r = spawnSync('git', ['-C', dir, 'branch', '--show-current'], { encoding: 'utf8' });
      return r.status === 0 ? r.stdout.trim() : '';
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Parsing: a small shell-lite tokenizer (bash, zsh, PowerShell). Not a full parser.
// ---------------------------------------------------------------------------------------------

type Redirect = { op: '<' | '>'; target: string };
type Simple = { words: string[]; reds: Redirect[]; bodies: string[] };

/** Index of the `)` matching the `(` at `open`, skipping quoted text; -1 when unbalanced. */
function matchParen(text: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '\\' && quote !== "'") i++;
    else if (quote) {
      if (c === quote) quote = '';
    } else if (c === "'" || c === '"') quote = c;
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return -1;
}

/** Pulls `$( )`, `<( )` and backtick bodies out of `text` so they are analysed as commands of their own. */
function extractSubstitutions(text: string): { outer: string; inner: string[] } {
  let outer = '';
  const inner: string[] = [];
  let single = false;
  let double = false;
  for (let i = 0; i < text.length; ) {
    const c = text[i] ?? '';
    if (single) {
      if (c === "'") single = false;
    } else if (c === '\\') {
      outer += text.slice(i, i + 2);
      i += 2;
      continue;
    } else if (c === "'" && !double) single = true;
    else if (c === '"') double = !double;
    else if ((c === '$' || c === '<') && text[i + 1] === '(') {
      const end = matchParen(text, i + 1);
      if (end !== -1) {
        inner.push(text.slice(i + 2, end));
        i = end + 1;
        continue;
      }
    } else if (c === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        inner.push(text.slice(i + 1, end));
        i = end + 1;
        continue;
      }
    }
    outer += c;
    i++;
  }
  return { outer, inner };
}

/** `posix`: a backslash outside quotes drops itself (`.en\v` is `.env`). Off keeps it, for Windows paths. */
function tokenize(text: string, posix = false): Simple[] {
  const out: Simple[] = [];
  let cur: Simple = { words: [], reds: [], bodies: [] };
  let word = '';
  let inWord = false;
  let pending: '<' | '>' | 'heredoc' | 'drop' | null = null;
  let stripTabs = false;
  const heredocs: { delim: string; strip: boolean; seg: Simple }[] = [];

  const endWord = () => {
    if (!inWord) return;
    if (pending === 'heredoc') heredocs.push({ delim: word, strip: stripTabs, seg: cur });
    else if (pending === '<' || pending === '>') cur.reds.push({ op: pending, target: word });
    else if (pending === null) cur.words.push(word);
    pending = null;
    word = '';
    inWord = false;
  };
  const endCommand = () => {
    endWord();
    pending = null;
    if (cur.words.length || cur.reds.length) out.push(cur);
    cur = { words: [], reds: [], bodies: [] };
  };
  // `2>file`: the fd number is not a word.
  const dropFd = () => {
    if (inWord && /^\d+$/.test(word)) {
      word = '';
      inWord = false;
    } else endWord();
  };

  const n = text.length;
  for (let i = 0; i < n; ) {
    const c = text[i] ?? '';
    const next = text[i + 1];
    if (c === '\n') {
      endCommand();
      i++;
      while (heredocs.length) {
        const h = heredocs.shift();
        const body: string[] = [];
        while (h && i < n) {
          const nl = text.indexOf('\n', i);
          const line = text.slice(i, nl === -1 ? n : nl);
          i = nl === -1 ? n : nl + 1;
          if ((h.strip ? line.trim() : line) === h.delim) break;
          body.push(line);
        }
        h?.seg.bodies.push(body.join('\n'));
      }
    } else if (c === ' ' || c === '\t' || c === '\r') {
      endWord();
      i++;
    } else if (c === '#' && !inWord) {
      while (i < n && text[i] !== '\n') i++;
    } else if (c === ';' || c === '|' || c === '(' || c === ')') {
      endCommand();
      i++;
    } else if (c === '&') {
      if (next === '>') {
        endWord();
        i += text[i + 2] === '>' ? 3 : 2;
        pending = '>';
      } else {
        endCommand();
        i++;
      }
    } else if (c === '<' || c === '>') {
      dropFd();
      let j = i + 1;
      if (c === '>') {
        if (text[j] === '>' || text[j] === '|') j++;
        pending = '>';
      } else if (text.startsWith('<<<', i)) {
        j = i + 3;
        pending = 'drop';
      } else if (text.startsWith('<<', i)) {
        j = i + 2;
        stripTabs = text[j] === '-';
        if (stripTabs) j++;
        pending = 'heredoc';
      } else {
        if (next === '>') j++;
        pending = '<';
      }
      if (text[j] === '&') {
        j++;
        pending = 'drop'; // `>&2`, `<&0`: fd duplication, no file
      }
      i = j;
    } else if (c === "'") {
      inWord = true;
      const end = text.indexOf("'", i + 1);
      word += text.slice(i + 1, end === -1 ? n : end);
      i = end === -1 ? n : end + 1;
    } else if (c === '"') {
      inWord = true;
      i++;
      while (i < n && text[i] !== '"') {
        if (text[i] === '\\' && '"\\$`'.includes(text[i + 1] ?? '\0')) i++;
        word += text[i];
        i++;
      }
      i++;
    } else if (c === '\\') {
      if (next === '\n') i += 2;
      else {
        inWord = true;
        // Only escape what shells escape; keep `\` in Windows paths (`C:\proj\.env`). `posix` removes every one.
        if (next && (posix || ' \t"\'$`;&|()<>#'.includes(next))) {
          word += next;
          i += 2;
        } else {
          word += c;
          i++;
        }
      }
    } else {
      inWord = true;
      word += c;
      i++;
    }
  }
  endCommand();
  return out;
}

// ---------------------------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------------------------

const WRAPPERS = new Set([
  'sudo', 'doas', 'command', 'builtin', 'time', 'exec', 'nohup', 'xargs', 'nice', 'stdbuf',
  'env', 'then', 'do', 'else', 'elif', 'if', 'while', 'until', '!', '{', '}',
]);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish', 'pwsh', 'powershell']);
const WRITERS = new Set([
  'tee', 'cp', 'mv', 'rm', 'chmod', 'chown', 'ln', 'touch', 'mkdir', 'install', 'truncate', 'dd', 'rmdir',
  'set-content', 'add-content', 'out-file', 'new-item', 'remove-item', 'copy-item', 'move-item', 'rename-item',
  'sc', 'ac', 'ni', 'ri', 'copy', 'move', 'del', 'erase', 'rd', 'ren',
]);
// First positional argument is a pattern or script, not a file.
const PATTERN_FIRST = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ag', 'sed', 'awk', 'gawk', 'jq', 'select-string', 'sls', 'findstr']);
// Interpreters that execute code given inline or on stdin (`-e`, `-c`, heredoc).
const INTERPRETERS = new Set(['bun', 'node', 'deno', 'python', 'python3', 'ruby', 'perl', 'php', 'tsx']);
const NET_TOOLS = new Set(['curl', 'wget', 'http', 'https', 'xh']);
const VALUE_FLAGS = new Set([
  '-A', '-B', '-C', '-m', '-g', '-t', '-T', '-d', '-j', '--glob', '--type', '--include', '--exclude',
  '--exclude-dir', '--max-count', '--context', '--max-depth',
]);
const PROTECTED_BRANCH = /^(main|master|develop|staging|production)$/;
const SECRET_NAME = /(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i;
const CREDENTIAL_PATH =
  /(^|\/)(\.ssh|\.aws|\.gnupg|\.config\/gh)(\/|$)|(^|\/)\.docker\/config\.json$|(^|\/)(\.npmrc|\.netrc|\.zshrc|\.bashrc|\.zprofile|\.bash_profile|\.envrc)$/;

const deny = (reason: string): Decision => ({ decision: 'deny', reason });

const ENV_DUMP = 'Blocked: dumping environment variables or tokens can expose secrets. Read a specific non-secret variable instead.';

const PM_DENY = deny(
  'This project uses bun. Install with `bun install`; add packages with `bunx expo install <pkg>` (dev deps: `bunx expo install <pkg> -- --dev`, package names BEFORE the --).',
);

function cmdName(word: string): string {
  return (word.split(/[\\/]/).pop() ?? '').toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, '');
}

function peel(words: string[]): { cmd: string; args: string[]; envDump: boolean } {
  const w = [...words];
  let envDump = false;
  for (;;) {
    while (w[0] !== undefined && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) w.shift();
    const name = w[0] === undefined ? '' : cmdName(w[0]);
    if (!WRAPPERS.has(name)) break;
    w.shift();
    while (w[0] !== undefined && (w[0].startsWith('-') || (name === 'env' && /^[A-Za-z_]\w*=/.test(w[0])))) w.shift();
    if (name === 'env' && w.length === 0) envDump = true;
  }
  return { cmd: w[0] === undefined ? '' : cmdName(w[0]), args: w.slice(1), envDump };
}

const firstPositional = (args: string[]) => args.find((a) => !a.startsWith('-'));

const BUN_VALUE_FLAGS = new Set(['--cwd', '--filter', '-F', '--config', '-c', '--env-file', '--preload', '-r', '--require', '--import', '--tsconfig-override', '--install', '--define', '-d', '--port', '--shell', '--conditions']);

/**
 * Normalises `bun [flags] [run] [flags] <script> ...` and `npm|pnpm|yarn [flags] run|exec <script> ...`
 * to the script name and its arguments, so `bun --silent run eas`, `bun eas`, `npm run eas -- x` all look alike.
 */
function scriptInvocation(cmd: string, args: string[]): { script: string; rest: string[] } | null {
  if (!['bun', 'npm', 'pnpm', 'yarn'].includes(cmd)) return null;
  let i = 0;
  const skipFlags = () => {
    while (i < args.length && (args[i] ?? '').startsWith('-')) i += cmd === 'bun' && BUN_VALUE_FLAGS.has(args[i] ?? '') ? 2 : 1;
  };
  skipFlags();
  if (['run', 'run-script', 'exec'].includes(args[i] ?? '')) {
    i++;
    skipFlags();
  } else if (cmd === 'npm') return null; // `npm eas` is not a script run
  const script = args[i];
  if (script === undefined) return null;
  return { script: cmdName(script), rest: args.slice(i + 1).filter((a) => a !== '--') };
}

const ASK = (reason: string): Decision => ({ decision: 'ask', reason });
const EAS_ASK_EXACT = new Set([
  'submit', 'update', 'update:republish', 'update:rollback', 'update:roll-back-to-embedded', 'update:revert-update-rollout',
  'credentials', 'env:set', 'env:create', 'env:update', 'env:delete', 'env:push', 'env:exec', 'build:version:set', 'build:version:sync',
  'workflow:run', 'deploy', 'build:submit',
]);
const EAS_READ_ONLY = new Set(['update:list', 'update:view', 'channel:list', 'channel:view', 'branch:list', 'branch:view']);

/** `eas` arguments (without the `eas` itself): deny what prints secrets, ask for what publishes, submits, or mutates the account. */
function evalEas(args: string[]): Decision | null {
  if (args.some((a) => a === 'env:pull' || a === 'env:get' || a === '--include-sensitive')) {
    return deny('Blocked: this prints EAS secret values. Ask the human to run it in their own terminal if needed.');
  }
  const at = args.findIndex((a) => !a.startsWith('-'));
  if (at === -1 || args.includes('--help') || args.includes('-h')) return null;
  const rest = args.slice(at + 1);
  // `eas env pull` / `eas update rollback` (space form) are the same command as `env:pull` / `update:rollback`.
  const names = [args[at] ?? ''];
  if (!names[0]?.includes(':') && rest[0] !== undefined && !rest[0].startsWith('-')) names.push(`${args[at]}:${rest[0]}`);
  if (names.some((n) => n === 'env:pull' || n === 'env:get')) {
    return deny('Blocked: this prints EAS secret values. Ask the human to run it in their own terminal if needed.');
  }
  const mutating = names.find(
    (n) =>
      !EAS_READ_ONLY.has(n) &&
      (EAS_ASK_EXACT.has(n) || /^(update|credentials|channel|branch|submit):/.test(n) || /^(channel|branch)$/.test(n)),
  );
  if (mutating) return ASK(`eas ${mutating} publishes, submits or changes the Expo account. Confirm this is intended.`);
  if (names[0] === 'build') {
    const profile = (() => {
      for (let i = 0; i < rest.length; i++) {
        const a = rest[i] ?? '';
        if (a === '--profile' || a === '-e') return rest[i + 1] ?? '';
        if (a.startsWith('--profile=') || a.startsWith('-e=')) return a.slice(a.indexOf('=') + 1);
        if (/^-e./.test(a)) return a.slice(2);
      }
      return null;
    })();
    if (rest.some((a) => a === '--auto-submit' || a.startsWith('--auto-submit=') || a.startsWith('--auto-submit-with-profile'))) {
      return ASK('eas build --auto-submit uploads the build to the store. Confirm this is intended.');
    }
    if (profile === null) return ASK('eas build without --profile uses the production profile. Pass --profile or confirm this is intended.');
    if (/production/i.test(profile)) return ASK('A production EAS build needs explicit approval.');
  }
  return null;
}

/** `f=@.env;type=text/plain`, `name@.env`, `f=<.env` (curl upload syntax) also name the file `.env`. */
function expandRef(v: string): string[] {
  const clean = (s: string) => (s.replace(/^[@<]/, '').split(';')[0] ?? '');
  const eq = v.indexOf('=');
  const out = [v, clean(eq > 0 ? v.slice(eq + 1) : v)];
  const at = v.indexOf('@');
  if (at > 0) out.push(clean(v.slice(at)));
  return out;
}

/** Words that name files: positional arguments plus the value of `--flag=value` and `key=value`. */
function pathCandidates(cmd: string, args: string[]): string[] {
  const out: string[] = [];
  const net = NET_TOOLS.has(cmd);
  let skipPattern = PATTERN_FIRST.has(cmd) && !args.some((a) => /^(-e|--regexp)/.test(a));
  for (let i = 0; i < args.length; i++) {
    const a = args[i] ?? '';
    if (a.startsWith('-')) {
      if (a === '-f' || a === '--file') {
        const v = args[i + 1];
        if (v !== undefined) out.push(v);
        i++;
      } else if (a.includes('=')) out.push(...expandRef(a.slice(a.indexOf('=') + 1)));
      else if (VALUE_FLAGS.has(a) || a === '-e' || a === '--regexp') {
        const v = args[i + 1] ?? '';
        if (v.startsWith('@') || (net && v !== '')) out.push(...expandRef(v)); // curl -d @.env, curl -T .env
        i++;
      } else if (!a.startsWith('--') && a.length > 2) out.push(...expandRef(a.slice(2))); // curl -d@.env, -T.env
      continue;
    }
    if (skipPattern) {
      skipPattern = false;
      continue;
    }
    out.push(...expandRef(a)); // `key=value`, `@.env` (curl -d @.env), `f=@.env` (curl -F)
  }
  return out;
}

function isDangerousRmTarget(target: string, ctx: Ctx): boolean {
  if (target === '') return false;
  const s = target.replace(/[\\/]+\*?$/, '').toLowerCase();
  if (['', '~', '$home', '${home}', '.', '*', '.*', '..', '$pwd', '${pwd}', '$env:userprofile'].includes(s)) return true;
  if (/^[a-z]:$/.test(s) || /^\.\.(\/\.\.)*$/.test(toPosix(s))) return true;
  if (/[~$]/.test(target)) return false;
  const abs = resolvePath(target, ctx.cwd).toLowerCase();
  const root = toPosix(ctx.root).toLowerCase();
  return abs === toPosix(ctx.home).toLowerCase() || abs === root || root.startsWith(`${abs === '/' ? '' : abs}/`);
}

/** Files a git command writes via `--output[=]<f>` (diff, log, show...) or `-o`/`--output-directory` (format-patch, archive). */
function gitOutputTargets(sub: string, rest: string[]): string[] {
  const out: string[] = [];
  const shortO = sub === 'format-patch' || sub === 'archive';
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i] ?? '';
    if (a === '--') break;
    // git accepts unambiguous prefixes of long options, so `--out`/`--outpu` count too.
    const long = /^--(ou|out|outp|outpu|output|output-directory)(=(.*))?$/.exec(a);
    if (long) {
      if (long[2] !== undefined) out.push(long[3] ?? '');
      else out.push(rest[++i] ?? '');
    } else if (shortO && a === '-o') out.push(rest[++i] ?? '');
    else if (shortO && /^-o./.test(a)) out.push(a.slice(2));
  }
  return out;
}

/** Output files are writes: protected files deny/ask like a shell redirect; outside the project only the OS temp dir is allowed. */
function evalGitOutput(targets: string[], dir: string, ctx: Ctx): Decision | null {
  const tmp = [tmpdir(), '/tmp'].map((t) => resolvePath(t, '/').toLowerCase());
  for (const target of targets) {
    if (target === '' || /[~$`]/.test(target)) {
      return deny('Blocked: git --output/-o target cannot be resolved statically. Use a literal path under the OS temp dir.');
    }
    const abs = resolvePath(target, dir);
    if (CREDENTIAL_PATH.test(abs)) return deny('Blocked: command touches a credential or shell config file.');
    const decision = classifyPath('write', abs, ctx.root);
    if (decision) return deny(`Blocked: git writes ${target} through --output/-o. ${decision.reason}`);
    const inTemp = tmp.some((t) => abs.toLowerCase().startsWith(`${t}/`));
    if (relativeToRoot(abs, ctx.root) === null && !inTemp) {
      return deny('Blocked: git --output/-o writes outside the project. Write under the OS temp dir instead.');
    }
  }
  return null;
}

function evalGit(args: string[], ctx: Ctx): Decision | null {
  let dir = ctx.cwd;
  let i = 0;
  while (i < args.length && (args[i] ?? '').startsWith('-')) {
    const a = args[i] ?? '';
    if (a === '-C') {
      dir = nativeResolve(dir, args[i + 1] ?? '.');
      i += 2;
    } else if (a === '-c' || a === '--git-dir' || a === '--work-tree' || a === '--namespace') i += 2;
    else i++;
  }
  const sub = args[i];
  const rest = args.slice(i + 1);

  const outputs = gitOutputTargets(sub ?? '', rest);
  if (outputs.length) {
    const d = evalGitOutput(outputs, dir, ctx);
    if (d) return d;
  }
  if (sub === 'commit') {
    const branch = ctx.branch(dir);
    if (PROTECTED_BRANCH.test(branch)) {
      return deny(`Commit blocked on protected branch '${branch}'. Create a feature branch first: git switch -c feat/<short-description>.`);
    }
  }
  if (sub === 'push') {
    const flags = rest.filter((a) => a.startsWith('-'));
    const positional = rest.filter((a) => !a.startsWith('-'));
    const forced = flags.some((a) => a.startsWith('--force') || (!a.startsWith('--') && a.includes('f')));
    const deleting = flags.some((a) => a === '--delete' || a === '-d');
    if (flags.includes('--mirror')) return deny('git push --mirror overwrites every remote ref. Push a feature branch instead.');
    const everything = flags.includes('--all');
    const refspecs = positional.slice(1);
    const current = ctx.branch(dir);
    const names = refspecs.map((r) => {
      const dst = r.includes(':') ? r.slice(r.lastIndexOf(':') + 1) : r;
      return dst === 'HEAD' || dst === '' ? current : dst.replace(/^\+/, '').replace(/^refs\/heads\//, '');
    });
    if (refspecs.length === 0) names.push(current);
    const targetsMain = everything || names.some((nm) => nm === 'main' || nm === 'master');
    const rewriting = forced || deleting || refspecs.some((r) => r.startsWith('+') || r.startsWith(':'));
    if (rewriting && targetsMain) {
      return deny('Force push or delete that can rewrite main/master blocked. Use --force-with-lease on a feature branch.');
    }
  }
  return null;
}

function evalSimple(seg: Simple, ctx: Ctx, depth: number): Decision | null {
  const found: Decision[] = [];
  const add = (d: Decision | null) => d && found.push(d);
  const { cmd, args, envDump } = peel(seg.words);

  for (const r of seg.reds) {
    if (r.target.startsWith('&')) continue;
    add(classifyPath(r.op === '>' ? 'write' : 'read', r.target, ctx.root));
    if (CREDENTIAL_PATH.test(toPosix(r.target))) add(deny('Blocked: command touches a credential or shell config file.'));
  }
  if (envDump) add(deny(ENV_DUMP));
  if (!cmd) return pick(found);

  // --- Re-evaluate what a launcher runs: `bunx x`, `bun x`, `pnpm dlx`, `yarn dlx`.
  const bunAt = cmd === 'bun' ? args.findIndex((a, k) => !a.startsWith('-') && !BUN_VALUE_FLAGS.has(args[k - 1] ?? '')) : -1;
  const runner = cmd === 'bunx' || (cmd === 'bun' && args[bunAt] === 'x') || ((cmd === 'pnpm' || cmd === 'yarn') && args[0] === 'dlx');
  if (runner) {
    const rest = args.slice(cmd === 'bunx' ? 0 : cmd === 'bun' ? bunAt + 1 : 1);
    let k = 0;
    while (k < rest.length && (rest[k] ?? '').startsWith('-')) k += rest[k] === '-p' || rest[k] === '--package' ? 2 : 1;
    const target = rest[k] === undefined ? '' : cmdName(rest[k] ?? '');
    if (['npm', 'npx', 'pnpm', 'yarn'].includes(target)) add(PM_DENY);
    else if (target) add(evalSimple({ words: rest.slice(k), reds: [], bodies: seg.bodies }, ctx, depth));
  }

  // --- Shells and eval: analyse the string they run.
  if (SHELLS.has(cmd)) {
    const at = args.findIndex((a) => /^-[a-z]*c[a-z]*$/.test(a) || /^-command$/i.test(a));
    if (at !== -1) add(evaluateBash(args.slice(at + 1).join(' '), ctx, depth + 1));
  } else if (cmd === 'eval' || (cmd === 'cmd' && /^\/c$/i.test(args[0] ?? ''))) {
    add(evaluateBash(args.slice(cmd === 'cmd' ? 1 : 0).join(' '), ctx, depth + 1));
  }

  // --- Package manager: bun only; SDK-aware installs go through `expo install`.
  const sub = firstPositional(args);
  if (cmd === 'npm' || cmd === 'pnpm') {
    if (sub && ['i', 'install', 'add', 'ci'].includes(sub)) add(PM_DENY);
  } else if (cmd === 'yarn') {
    if (args.length === 0 || sub === 'add' || sub === 'install') add(PM_DENY);
  } else if (cmd === 'npx') {
    add(deny('Use `bunx` instead of `npx` (vendored skills say npx; this project runs bun).'));
  } else if (cmd === 'bun') {
    if (args[0] === 'add' || args[0] === 'a') {
      add(deny('Use `bunx expo install <pkg>` instead of `bun add` so Expo picks SDK-compatible versions.'));
    } else if ((args[0] === 'install' || args[0] === 'i') && args.some((a) => a === '-g' || a === '--global')) {
      add(deny('Global installs change the machine, not the project. Use `bunx --no-install <cli>` for pinned CLIs.'));
    } else if ((args[0] === 'install' || args[0] === 'i') && args.slice(1).some((a) => !a.startsWith('-'))) {
      add(PM_DENY); // `bun install <pkg>` adds a package like `bun add`
    }
  }

  if (cmd === 'git') add(evalGit(args, ctx));

  // --- Recursive deletes of root, home, or the whole project.
  const psRecurse = args.some((a) => /^-r(e(c(u(r(se?)?)?)?)?)?$/i.test(a));
  const rmRecurse = args.some((a) => /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(a) || a === '--recursive');
  if (((cmd === 'rm' || cmd === 'rmdir') && rmRecurse) || (['remove-item', 'ri', 'del', 'erase', 'rd'].includes(cmd) && psRecurse)) {
    if (args.some((a) => !a.startsWith('-') && isDangerousRmTarget(a, ctx))) {
      add(deny('Recursive delete of root, home, or the whole project blocked. Delete specific paths.'));
    }
  }

  // --- Environment dumps and credential extraction.
  const secretWord = (a: string) => SECRET_NAME.test(a);
  if (
    (cmd === 'env' && args.length === 0) ||
    (cmd === 'printenv' && (args.length === 0 || args.some(secretWord))) ||
    (cmd === 'set' && args.length === 0) ||
    (cmd === 'export' && (args.length === 0 || args.includes('-p'))) ||
    ((cmd === 'declare' || cmd === 'typeset') && args.some((a) => /^-[a-z]*[xp]/.test(a))) ||
    (cmd === 'gh' && args[0] === 'auth' && args[1] === 'token') ||
    (cmd === 'gh' && args[0] === 'secret') ||
    seg.words.some(
      (w) =>
        /^env:$/i.test(w) ||
        /^\$env:$/i.test(w) ||
        (/^\$env:/i.test(w) && secretWord(w)) ||
        /GetEnvironmentVariables/i.test(w) ||
        /\/proc\/[^/]+\/environ/.test(w),
    )
  ) {
    add(deny(ENV_DUMP));
  }
  if (cmd === 'security' && (args[0] === 'find-generic-password' || args[0] === 'find-internet-password')) {
    add(deny('Blocked: macOS Keychain secret extraction.'));
  }
  // EAS: `bunx eas-cli@<v>` runs as cmd `eas-cli@<v>`; `bun run eas`, `bun eas`, `npm run eas` go through scriptInvocation.
  const inv = scriptInvocation(cmd, args);
  if (/^eas(-cli)?(@.+)?$/.test(cmd)) add(evalEas(args));
  else if (inv && /^eas(-cli)?(@.+)?$/.test(inv.script)) add(evalEas(inv.rest));
  // e2e: the runner executes TypeScript; an alternate --config could run arbitrary code.
  const e2eRest = cmd === 'e2e' ? args : inv && (inv.script === 'e2e' || inv.script.startsWith('test:e2e')) ? inv.rest : null;
  if (e2eRest?.some((a) => a === '--config' || a.startsWith('--config='))) {
    add(deny("Blocked: e2e with --config runs an arbitrary config file. Use the repo's e2e.config.ts (bun run test:e2e:*)."));
  }

  // --- Code passed on the command line (bun -e, node -e, python -c) or on stdin (heredoc): scan it for .env paths.
  const scanCode = (code: string) => {
    for (const m of code.matchAll(/(^|[^\w.])(\.env(\.[\w-]+)*)/g)) {
      if (isEnvName(m[2] ?? '')) add(deny(`Blocked: command touches a ${m[2]} file, which holds secrets. Use .env.example for variable names.`));
    }
  };
  if (INTERPRETERS.has(cmd) && args.some((a) => /^(-e|-c|-p|--eval|--print|eval)$/.test(a))) args.forEach(scanCode);
  if (INTERPRETERS.has(cmd) || SHELLS.has(cmd)) {
    for (const body of seg.bodies) {
      scanCode(body);
      if (SHELLS.has(cmd)) add(evaluateBash(body, ctx, depth + 1)); // `bash <<EOF ... EOF`
    }
  }

  // --- Files named on the command line. Commit messages and echoed text are not files.
  let fileCmd = cmd;
  let fileArgs = args;
  if (cmd === 'echo' || cmd === 'printf' || cmd === 'write-host' || cmd === 'write-output') fileArgs = [];
  else if (cmd === 'git' || cmd === 'gh') {
    fileArgs = args.filter((a, i) => {
      const prev = args[i - 1] ?? '';
      const messageValue = /^(-[a-zA-Z]*m|--message|-b|--body|-t|--title)$/.test(prev);
      return !messageValue && !/^--(message|body|title)=/.test(a);
    });
    const g = fileArgs.indexOf('grep');
    if (cmd === 'git' && g !== -1) {
      fileCmd = 'grep';
      fileArgs = fileArgs.slice(g + 1);
    }
  }
  const writes = WRITERS.has(cmd) || (cmd === 'sed' && args.some((a) => /^-[a-z]*i/.test(a) || a.startsWith('--in-place')));
  for (const w of pathCandidates(fileCmd, fileArgs)) {
    add(classifyPath(writes ? 'write' : 'read', w, ctx.root));
    if (CREDENTIAL_PATH.test(toPosix(w))) add(deny('Blocked: command touches a credential or shell config file.'));
  }

  return pick(found);
}

function pick(found: Decision[]): Decision | null {
  return found.find((d) => d.decision === 'deny') ?? found[0] ?? null;
}

export function evaluateBash(command: string, ctx: Ctx = defaultCtx(), depth = 0): Decision | null {
  if (depth > 4 || !command.trim()) return null;
  const { outer, inner } = extractSubstitutions(command);
  const found: Decision[] = [];
  let cwd = ctx.cwd;
  // A second pass drops every backslash like POSIX shells do (`.en\v` is `.env`); the first keeps Windows paths intact.
  for (const segs of outer.includes('\\') ? [tokenize(outer), tokenize(outer, true)] : [tokenize(outer)]) {
    cwd = ctx.cwd;
    for (const seg of segs) {
      const d = evalSimple(seg, { ...ctx, cwd }, depth);
      if (d) found.push(d);
      const { cmd, args } = peel(seg.words);
      const dest = args.find((a) => !a.startsWith('-'));
      if (['cd', 'pushd', 'set-location', 'sl'].includes(cmd) && dest && !/^[~$-]/.test(dest)) cwd = nativeResolve(cwd, dest);
    }
  }
  for (const body of inner) {
    const d = evaluateBash(body, { ...ctx, cwd }, depth + 1);
    if (d) found.push(d);
  }
  return pick(found);
}

export function evaluateBashTool(input: HookInput): Decision | null {
  const command = input.tool_input?.command;
  return typeof command === 'string' ? evaluateBash(command) : null;
}

export const main = () => runHook(evaluateBashTool);

if (import.meta.main) await main();
