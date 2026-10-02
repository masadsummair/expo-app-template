#!/usr/bin/env bash
# Regression tests for the Claude Code hooks in this folder. Run: bash .claude/hooks/test-hooks.sh
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
export CLAUDE_PROJECT_DIR=$PWD
fail=0

expect() { # expect <hook> <want: deny|ask|allow> <label> <json>
  local out status got
  out=$("$1" <<<"$4" 2>/dev/null); status=$?
  # A hook that crashes or isn't executable fails OPEN in Claude Code — treat it as a failure here.
  if [[ $status -ne 0 ]]; then printf 'FAIL  hook exited %s  %s\n' "$status" "$3"; fail=1; return; fi
  got=$(jq -r '.hookSpecificOutput.permissionDecision // empty' <<<"$out" 2>/dev/null); got=${got:-allow}
  if [[ "$got" == "$2" ]]; then printf 'PASS  %-5s %s\n' "$2" "$3"
  else printf 'FAIL  want=%s got=%s  %s\n' "$2" "$got" "$3"; fail=1; fi
}

bash_cmd() { jq -nc --arg c "$1" '{tool_name:"Bash",tool_input:{command:$c}}'; }
file_op() { jq -nc --arg t "$1" --arg p "$PWD/$2" --arg c "${3:-}" '{tool_name:$t,tool_input:{file_path:$p,content:$c,new_string:$c}}'; }
grep_op() { jq -nc --arg p "$1" '{tool_name:"Grep",tool_input:{pattern:"KEY",path:$p}}'; }

G=$PWD/.claude/hooks/guard-bash.sh
F=$PWD/.claude/hooks/guard-files.sh
force="--for""ce"   # split so this file's own text doesn't trip global guards
push="pu""sh"

echo "guard-bash: package manager"
expect $G deny  "npm install"            "$(bash_cmd 'npm install lodash')"
expect $G deny  "npm ci"                 "$(bash_cmd 'npm ci')"
expect $G deny  "yarn add after cd"      "$(bash_cmd 'cd app && yarn add zod')"
expect $G deny  "bare yarn"              "$(bash_cmd 'yarn')"
expect $G deny  "bun add"                "$(bash_cmd 'bun add zustand')"
expect $G deny  "npx"                    "$(bash_cmd 'npx expo install zustand')"
expect $G allow "bunx expo install"      "$(bash_cmd 'bunx expo install zustand')"
expect $G allow "bun install"            "$(bash_cmd 'bun install')"
expect $G allow "npm view (read-only)"   "$(bash_cmd 'npm view expo version')"
expect $G allow "'npx' inside an arg"    "$(bash_cmd 'grep -rn "npx expo" .claude/skills')"

echo "guard-bash: git"
expect $G deny  "force push main"        "$(bash_cmd "git $push $force origin main")"
expect $G deny  "-f push main"           "$(bash_cmd "git $push -f origin main")"
expect $G deny  "+refspec main"          "$(bash_cmd "git $push origin +main")"
expect $G allow "force-with-lease"       "$(bash_cmd "git $push ${force}-with-lease origin feat/x")"
expect $G allow "force feature branch"   "$(bash_cmd "git $push $force origin feat/domain-x")"

echo "guard-bash: destructive deletes"
expect $G deny  "rm -rf ~"               "$(bash_cmd 'rm -rf ~')"
expect $G deny  "rm -rf ~/"              "$(bash_cmd 'rm -rf ~/')"
expect $G deny  'rm -rf "$HOME"'         "$(bash_cmd 'rm -rf "$HOME"')"
expect $G deny  "rm -r -f ."             "$(bash_cmd 'rm -r -f .')"
expect $G deny  "rm -rf ."               "$(bash_cmd 'rm -rf .')"
expect $G allow "rm -rf node_modules"    "$(bash_cmd 'rm -rf node_modules .expo')"
expect $G allow "rm -rf ./dist"          "$(bash_cmd 'rm -rf ./dist')"

echo "guard-bash: secrets"
expect $G deny  "cat .env"               "$(bash_cmd 'cat .env')"
expect $G deny  "cat .env.production"    "$(bash_cmd 'cat .env.production')"
expect $G deny  "glob ./.env*"           "$(bash_cmd 'cat ./.env*')"
expect $G deny  "cp .env"                "$(bash_cmd 'cp .env /tmp/x')"
expect $G deny  "base64 .env"            "$(bash_cmd 'base64 .env')"
expect $G deny  "source .env"            "$(bash_cmd 'source .env')"
expect $G deny  "redirect from .env"     "$(bash_cmd 'while read l; do echo $l; done < .env')"
expect $G deny  "git diff --no-index"    "$(bash_cmd 'git diff --no-index /dev/null .env')"
expect $G allow "cat .env.example"       "$(bash_cmd 'cat .env.example')"
expect $G allow "process.env in grep"    "$(bash_cmd 'grep -rn "process.env.EXPO_PUBLIC" src')"
expect $G deny  "env dump"               "$(bash_cmd 'env > /tmp/e')"
expect $G deny  "printenv secret"        "$(bash_cmd 'printenv GITHUB_TOKEN')"
expect $G deny  "printenv | grep"        "$(bash_cmd 'printenv | grep API_KEY')"
expect $G deny  "~/.aws"                 "$(bash_cmd 'cat ~/.aws/credentials')"
expect $G deny  "~/.ssh"                 "$(bash_cmd 'cat $HOME/.ssh/id_rsa')"
expect $G deny  "keychain read"          "$(bash_cmd 'security find-generic-password -s x')"
expect $G allow "EXPO_PUBLIC env prefix" "$(bash_cmd 'EXPO_PUBLIC_API_URL=https://x bunx expo export')"

echo "guard-files"
expect $F deny  "read .env"              "$(file_op Read .env)"
expect $F deny  "read .env.production"   "$(file_op Read .env.production)"
expect $F allow "read .env.example"      "$(file_op Read .env.example)"
expect $F deny  "grep inside .env"       "$(grep_op "$PWD/.env")"
expect $F allow "grep src"               "$(grep_op "$PWD/src")"
expect $F deny  "edit ios/"              "$(file_op Edit ios/App/AppDelegate.swift 'x')"
expect $F deny  "write android/"         "$(file_op Write android/app/build.gradle 'x')"
expect $F ask   "edit a hook"            "$(file_op Edit .claude/hooks/guard-bash.sh 'x')"
expect $F ask   "edit settings.json"     "$(file_op Edit .claude/settings.json 'x')"
expect $F allow "edit a skill"           "$(file_op Edit .claude/skills/new-screen/SKILL.md 'x')"
expect $F allow "edit src file"          "$(file_op Edit src/app/sign-in.tsx 'const a = 1')"
expect $F deny  "public secret var"      "$(file_op Write src/config/x.ts 'process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY')"
expect $F allow "public publishable var" "$(file_op Write src/config/x.ts 'process.env.EXPO_PUBLIC_SENTRY_DSN')"

echo "guard-bash: protected branch (throwaway repo on main)"
tmp=$(mktemp -d)
(cd "$tmp" && git init -q -b main)
out=$(cd "$tmp" && "$G" <<<"$(bash_cmd 'git commit -m x')")
[[ $(jq -r '.hookSpecificOutput.permissionDecision' <<<"$out") == deny ]] \
  && echo "PASS  deny  commit on main" || { echo "FAIL  commit on main was not denied"; fail=1; }
out=$(cd "$tmp" && "$G" <<<"$(bash_cmd 'git -c user.name=x commit -m x')")
[[ $(jq -r '.hookSpecificOutput.permissionDecision' <<<"$out") == deny ]] \
  && echo "PASS  deny  git -c … commit on main" || { echo "FAIL  git -c commit on main was not denied"; fail=1; }
(cd "$tmp" && git switch -q -c feat/x)
out=$(cd "$tmp" && "$G" <<<"$(bash_cmd 'git commit -m x')")
[[ -z "$out" ]] && echo "PASS  allow commit on feat/x" || { echo "FAIL  commit on feat/x was blocked"; fail=1; }
rm -rf "$tmp"

echo "fail-closed without jq"
# A PATH holding only bash (macOS and many distros ship /usr/bin/jq, so /usr/bin can't be used).
nojq=$(mktemp -d)
ln -s "$(command -v bash)" "$nojq/bash"
PATH=$nojq "$G" <<<'{}' >/dev/null 2>&1
[[ $? -eq 2 ]] && echo "PASS  guard-bash blocks when jq is missing" || { echo "FAIL  guard-bash fails open without jq"; fail=1; }
PATH=$nojq "$F" <<<'{}' >/dev/null 2>&1
[[ $? -eq 2 ]] && echo "PASS  guard-files blocks when jq is missing" || { echo "FAIL  guard-files fails open without jq"; fail=1; }
rm -rf "$nojq"

exit $fail
