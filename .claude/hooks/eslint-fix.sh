#!/usr/bin/env bash
# PostToolUse (Edit|Write): run eslint --fix on the edited .ts/.tsx file only.
# Exits 0 for other files or when tooling is missing; exits 2 with findings on stderr otherwise.
payload=$(cat)
f=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
case "$f" in *.ts|*.tsx) ;; *) exit 0 ;; esac
# Resolve symlinks in the directory part so a path outside the project is never linted.
root=$(cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null && pwd -P) || exit 0
dir=$(cd "$(dirname "$f")" 2>/dev/null && pwd -P) || exit 0
[ -L "$f" ] && exit 0
f="$dir/$(basename "$f")"
case "$f" in "$root"/*) rel="${f#"$root"/}" ;; *) exit 0 ;; esac
case "$rel" in node_modules/*|.next/*|.claude/*) exit 0 ;; esac
[ -f "$f" ] || exit 0
# Mark this session as having edited TypeScript so the Stop hook runs tsc only then.
sid=$(printf '%s' "$payload" | jq -r '.session_id // empty' 2>/dev/null | tr -cd 'A-Za-z0-9_-')
[ -n "$sid" ] && touch "${TMPDIR:-/tmp}/furchert-tsc-$sid" 2>/dev/null
command -v node >/dev/null 2>&1 || exit 0
cd "$root" || exit 0
[ -x node_modules/.bin/eslint ] || exit 0
node_modules/.bin/eslint --fix "$f" >&2 || exit 2
exit 0
