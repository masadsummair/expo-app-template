#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit): lint only the file that just changed, so Claude sees
# errors immediately. Full typecheck stays in `bun run verify` (too slow per edit).
set -uo pipefail

path=$(jq -r '.tool_input.file_path // empty')
[[ "$path" =~ \.(ts|tsx|js|jsx)$ ]] || exit 0
[[ -f "$path" ]] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0
[[ -x node_modules/.bin/eslint ]] || exit 0

if ! out=$(node_modules/.bin/eslint --no-warn-ignored "$path" 2>&1); then
  printf 'ESLint errors in %s — fix before continuing:\n%s\n' "$path" "$out" >&2
  exit 2
fi
exit 0
