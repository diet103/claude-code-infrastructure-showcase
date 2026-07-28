#!/bin/bash
# Sync canonical skills (.claude/skills/) to the cross-agent standard
# location (.agents/skills/) that Codex and other Agent-Skills-compatible
# tools read. skill-rules.json stays behind - it configures the Claude/Codex
# hook layer, not the skills themselves.
#
# Usage: .claude/scripts/sync-agent-skills.sh [--check]
#   --check   exit 1 if .agents/skills is out of date, without syncing

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
SRC="$PROJECT_DIR/.claude/skills"
DST="$PROJECT_DIR/.agents/skills"
MODE="${1:-sync}"

if [ ! -d "$SRC" ]; then
    echo "sync-agent-skills: no $SRC directory"
    exit 1
fi

drift=0
for skill_dir in "$SRC"/*/; do
    name=$(basename "$skill_dir")
    if [ "$MODE" = "--check" ]; then
        if ! diff -rq "$skill_dir" "$DST/$name" >/dev/null 2>&1; then
            echo "  drift: $name"
            drift=1
        fi
    else
        mkdir -p "$DST/$name"
        rsync -a --delete "$skill_dir" "$DST/$name/" 2>/dev/null || cp -r "$skill_dir/." "$DST/$name/"
        echo "  synced: $name"
    fi
done

if [ "$MODE" = "--check" ]; then
    if [ "$drift" -eq 1 ]; then
        echo "Run .claude/scripts/sync-agent-skills.sh to update .agents/skills"
        exit 1
    fi
    echo ".agents/skills is in sync with .claude/skills"
else
    echo "Done. (.agents/skills is what Codex and other Agent-Skills tools read.)"
fi
