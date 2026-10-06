// Stable launcher for the guard hooks: `bun run.ts <guard-name>`.
// Claude Code only blocks a tool call on exit code 2. If a guard module has a syntax error, a bad import or throws
// while loading, bun exits 1 and the call would go through unguarded (fail open). This file imports the guard inside
// try/catch and turns every failure into exit 2. Keep it tiny, dependency-free and rarely edited: a bug here would
// fail open again (hooks.test.ts asserts every hook in settings.json points at an existing file here).
// Documented limitation: if `bun` itself is missing, Claude Code cannot run any hook, so nothing here can help.
const GUARDS = ['guard-bash', 'guard-files', 'lint-changed'];

const name = process.argv[2] ?? '';
try {
  if (!GUARDS.includes(name)) throw new Error(`unknown guard "${name}"`);
  const mod = (await import(`./${name}.ts`)) as { main?: unknown };
  if (typeof mod.main !== 'function') throw new Error('guard does not export main()');
  await mod.main();
} catch (error) {
  process.stderr.write(`Claude Code hook "${name}" could not run, blocking: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
}
