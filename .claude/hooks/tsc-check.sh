#!/usr/bin/env bash
# Stop (warn-only): run tsc --noEmit if this session edited .ts/.tsx (marker set by eslint-fix.sh).
# Always exits 0; a failure is reported as a systemMessage, never as a forced continuation.
command -v jq >/dev/null 2>&1 || exit 0
payload=$(cat)
[ "$(printf '%s' "$payload" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0
sid=$(printf '%s' "$payload" | jq -r '.session_id // empty' | tr -cd 'A-Za-z0-9_-')
marker="${TMPDIR:-/tmp}/furchert-tsc-$sid"
[ -n "$sid" ] && [ -f "$marker" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0
command -v node >/dev/null 2>&1 || exit 0
[ -x node_modules/.bin/tsc ] || exit 0
rm -f "$marker"
out=$(node_modules/.bin/tsc --noEmit 2>&1) && exit 0
jq -n --arg m "tsc --noEmit failed: $(printf '%s' "$out" | head -n 20)" '{systemMessage: $m}'
exit 0
