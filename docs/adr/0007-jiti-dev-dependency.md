# 0007 · jiti as a dev dependency

Status: Accepted (maintainer approved) · 2026-10-14

## Context

ESLint 9 loads `eslint.config.ts` through `jiti` (`node_modules/eslint/lib/config/config-loader.js`: "The 'jiti' library is required for loading TypeScript configuration files"). `bun run lint` runs ESLint under Node, which takes this path on every Node version unless `--flag unstable_native_nodejs_ts_config` is passed. ESLint lists `jiti` as an optional peer dependency, so it is not installed for us: until now it arrived only through Tailwind, and a Tailwind release that dropped it would break lint.

## Decision

Declare `jiti` as an exact dev dependency, pinned to the version already in the tree (2.7.0).

Intake record (`intake.audit-record`):

- **Licence:** MIT.
- **Maintenance and adoption:** `unjs/jiti`, one npm maintainer (`pi0`). 22 releases in the 2.x line since June 2024; 2.7.0 (May 2026) is the latest. About 193 million downloads in the week of 6–12 October 2026 (npm registry). It is the loader ESLint uses for TypeScript configs (an optional peer dependency).
- **Source read:** not in full. Read: ESLint's `config-loader.js` call path that loads it. It runs only at lint time on our own config file, never in the app.
- **Provenance:** the npm package `jiti`, already resolved in `bun.lock` as a transitive dependency with the same sha512 integrity; this change only declares it.
- **Expo SDK and New Architecture:** not applicable. It is a dev tool, not bundled into the app.
- **Native impact:** none.
- **Migration cost:** remove it when ESLint loads TypeScript configs natively without a flag.

## Consequences

- Lint no longer depends on another package's dependency tree.
- Raising the Node `engines` floor would not have removed the need: ESLint uses `jiti` under Node unless a flag is passed.
