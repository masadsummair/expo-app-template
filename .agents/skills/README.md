# Generated, do not edit

This folder is a copy of `.claude/skills/`, made for Codex and Gemini CLI, which scan
`.agents/skills/` and not `.claude/skills/`. Edit the skills in `.claude/skills/`, then run:

    bun run skills:sync

`bun run verify` fails when this copy has drifted. Cursor reads both folders, so it lists each
skill twice; delete `.agents/` if you only use Cursor and Claude Code.
