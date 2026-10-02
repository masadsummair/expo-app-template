#!/usr/bin/env bash
# PreToolUse(Bash) guard. Denies commands that are destructive, bypass the team workflow,
# or read secrets. Silent output = no opinion (the normal permission flow applies).
# These are guardrails against mistakes and prompt injection, not a sandbox.
set -uo pipefail

# Fail closed: without jq this hook can't read its input, and a silent exit 0 would allow everything.
command -v jq >/dev/null || { echo "Claude Code hooks require jq (brew install jq / apt install jq)." >&2; exit 2; }

deny() {
  jq -nc --arg r "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

cmd=$(jq -r '.tool_input.command // empty')
[[ -z "$cmd" ]] && exit 0
branch=$(git branch --show-current 2>/dev/null || true)

# A command word at the start of the line or after ; & | ( — not text inside arguments.
AT='(^|[;&|(][[:space:]]*)'

# --- Package manager: bun only; SDK-aware installs go through `expo install`.
if grep -qE "${AT}(npm|pnpm)[[:space:]]+(i|install|add|ci)([[:space:]]|$)|${AT}yarn([[:space:]]+(add|install))?([[:space:]]*($|[;&|]))|${AT}yarn[[:space:]]+add[[:space:]]" <<<"$cmd"; then
  deny "This project uses bun. Install with \`bun install\`; add packages with \`bunx expo install <pkg>\` (dev deps: \`bunx expo install <pkg> -- --dev\`, package names BEFORE the --)."
fi
if grep -qE "${AT}bun[[:space:]]+add([[:space:]]|$)" <<<"$cmd"; then
  deny "Use \`bunx expo install <pkg>\` instead of \`bun add\` so Expo picks SDK-compatible versions."
fi
if grep -qE "${AT}npx[[:space:]]" <<<"$cmd"; then
  deny "Use \`bunx\` instead of \`npx\` (vendored skills say npx; this project runs bun)."
fi

# --- Commits on protected branches (also `git -C dir commit`, `git -c k=v commit`).
if grep -qE "${AT}git([[:space:]]+-[cC][[:space:]]+[^[:space:]]+)*[[:space:]]+commit([[:space:]]|$)" <<<"$cmd" \
  && grep -qE '^(main|master|develop|staging|production)$' <<<"$branch"; then
  deny "Commit blocked on protected branch '$branch'. Create a feature branch first: git switch -c feat/<short-description>."
fi

# --- Force pushes that could rewrite main/master (--force-with-lease is allowed).
if grep -qE "${AT}git[[:space:]].*push" <<<"$cmd"; then
  forced=false
  grep -qE '(^|[[:space:]])(-f|--force)([[:space:]]|$)|[[:space:]]\+[^[:space:]]+' <<<"$cmd" && forced=true
  targets_main=false
  grep -qE '(^|[[:space:]:+/])(main|master)([[:space:]]|$)' <<<"$cmd" && targets_main=true
  grep -qE '^(main|master)$' <<<"$branch" && targets_main=true
  if $forced && $targets_main; then
    deny "Force push that can rewrite main/master blocked. Use --force-with-lease on a feature branch."
  fi
fi

# --- Recursive deletes of root, home, or the whole project.
if grep -qE "${AT}rm[[:space:]]" <<<"$cmd" \
  && grep -qE '[[:space:]]-[a-zA-Z]*[rR]|[[:space:]]--recursive' <<<"$cmd" \
  && grep -qE '[[:space:]]("?\$HOME"?/?|~/?|/|\.|\./|\*|\./\*)([[:space:]]|$)' <<<"$cmd"; then
  deny "Recursive delete of root, home, or the whole project blocked. Delete specific paths."
fi

# --- Secrets: .env files (any variant except .env.example), credential stores, env dumps.
# Match `.env` only as a path token (not inside `process.env.X`).
env_refs=$(grep -oE '(^|[^[:alnum:]_.])\.env(\.[A-Za-z0-9_-]+)*' <<<"$cmd" | sed -E 's/^[^.]//' | grep -vxE '\.env\.example' || true)
if [[ -n "$env_refs" ]]; then
  deny "Blocked: command touches a .env file ($(tr '\n' ' ' <<<"$env_refs")), which holds secrets. Use .env.example for variable names."
fi
if grep -qE '(\.ssh/|\.aws/|\.npmrc|\.netrc|\.zshrc|\.bashrc|\.zprofile|\.bash_profile|\.envrc|\.config/gh/)' <<<"$cmd"; then
  deny "Blocked: command touches a credential or shell config file."
fi
if grep -qE "${AT}(printenv|env|export -p|set)([[:space:]]*($|[;&|>])|[[:space:]]+[A-Z_]*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL))" <<<"$cmd"; then
  deny "Blocked: dumping environment variables can expose secrets. Read a specific non-secret variable instead."
fi
if grep -qE 'security[[:space:]]+find-(generic|internet)-password' <<<"$cmd"; then
  deny "Blocked: macOS Keychain secret extraction."
fi

exit 0
