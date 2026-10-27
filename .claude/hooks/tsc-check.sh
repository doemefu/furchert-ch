#!/usr/bin/env bash
# Stop: run tsc --noEmit when TypeScript-relevant files changed.
# Exits 0 when tooling is missing, nothing relevant changed, or a previous stop-hook block is active.
payload=$(cat)
[ "$(printf '%s' "$payload" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0
command -v node >/dev/null 2>&1 || exit 0
[ -x node_modules/.bin/tsc ] || exit 0
[ -n "$(git status --porcelain -- '*.ts' '*.tsx' tsconfig.json package.json 2>/dev/null)" ] || exit 0
node_modules/.bin/tsc --noEmit >&2 || exit 2
exit 0
