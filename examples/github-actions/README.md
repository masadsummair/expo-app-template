# Optional GitHub Actions

The template runs its checks locally (`.githooks/pre-commit` runs `bun run verify` before every commit) and ships no
CI/CD. If your app wants CI, copy what you need:

| File | Copy to | What it does |
|---|---|---|
| `ci.yml` | `.github/workflows/ci.yml` | `bun run verify` and expo-doctor on Linux; most checks on Windows and macOS; every PR and push to `main` |
| `e2e.yml` | `.github/workflows/e2e.yml` | builds a release-style Android APK (minified, lint skipped) and runs the e2e suite on an emulator: PRs labelled `e2e`, pushes to `main`, manual dispatch; no secrets |
| `dependabot.yml` | `.github/dependabot.yml` | weekly bumps for the SHA-pinned actions in those workflows |

All three passed on GitHub before they moved here. Actions are pinned to commit SHAs; keep Dependabot (or bump them
yourself) once you copy them. macOS and Windows runners bill at higher rates on private repos: drop those matrix rows
if you don't need them.
