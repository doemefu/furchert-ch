#!/usr/bin/env bash
# Stop: run tsc --noEmit, but only if this session edited .ts/.tsx (marker set by eslint-fix.sh).
# Exits 0 when jq or tooling is missing, no marker exists, or a previous stop-hook block is active.
command -v jq >/dev/null 2>&1 || exit 0
payload=$(cat)
[ "$(printf '%s' "$payload" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0
sid=$(printf '%s' "$payload" | jq -r '.session_id // empty' | tr -cd 'A-Za-z0-9_-')
marker="${TMPDIR:-/tmp}/furchert-tsc-$sid"
[ -n "$sid" ] && [ -f "$marker" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0
command -v node >/dev/null 2>&1 || exit 0
[ -x node_modules/.bin/tsc ] || exit 0
node_modules/.bin/tsc --noEmit >&2 || exit 2
rm -f "$marker"
exit 0
