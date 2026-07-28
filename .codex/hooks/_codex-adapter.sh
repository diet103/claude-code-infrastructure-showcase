#!/bin/bash
# Codex -> Claude Code hook adapter.
#
# Codex's 2026 hooks system uses the same events, stdin fields, and exit-code
# semantics as Claude Code, so the canonical hook scripts in .claude/hooks/
# run unchanged. This adapter closes the two real gaps:
#   1. Codex doesn't set CLAUDE_PROJECT_DIR (hooks run at the session cwd).
#   2. Codex's native edit tool is apply_patch, whose input carries a patch
#      body instead of a file_path - the guard needs per-file events.
#
# Usage (in .codex/hooks.json): _codex-adapter.sh <wrapper-in-.claude/hooks>
# Example:                      _codex-adapter.sh skill-verification-guard.sh
set -u

TARGET="$1"
export CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
HOOK="$CLAUDE_PROJECT_DIR/.claude/hooks/$TARGET"

INPUT=$(cat)

# Fail open if the repo layout is unexpected - never break the agent loop.
if [ ! -x "$HOOK" ]; then
    exit 0
fi

tool_name=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null)

if [ "$tool_name" = "apply_patch" ]; then
    # Extract target paths from the patch body and run the guard once per
    # file with a synthesized Edit event. First block (exit 2) wins.
    patch=$(printf '%s' "$INPUT" | jq -r '.tool_input.input // .tool_input.patch // (.tool_input | tostring)' 2>/dev/null)
    session=$(printf '%s' "$INPUT" | jq -r '.session_id // "codex-session"' 2>/dev/null)
    paths=$(printf '%s' "$patch" | sed -n 's/^\*\*\* \(Update\|Add\) File: //p' | sort -u)

    if [ -z "$paths" ]; then
        exit 0
    fi
    while IFS= read -r p; do
        [ -z "$p" ] && continue
        case "$p" in
            /*) abs="$p" ;;
            *) abs="$CLAUDE_PROJECT_DIR/$p" ;;
        esac
        event=$(jq -cn --arg sid "$session" --arg fp "$abs" \
            '{session_id: $sid, tool_name: "Edit", tool_input: {file_path: $fp}}')
        printf '%s' "$event" | "$HOOK"
        rc=$?
        if [ "$rc" -eq 2 ]; then
            exit 2
        fi
    done <<< "$paths"
    exit 0
fi

# Everything else: Codex's stdin schema matches Claude Code's - pass through.
printf '%s' "$INPUT" | exec "$HOOK"
