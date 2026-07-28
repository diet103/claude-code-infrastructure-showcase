#!/bin/bash
# Stop hook - session doc indexing + stale session-state pruning

# Prune per-session state files and tsc caches older than 7 days.
# This is the only wired hook that fires at a natural cleanup point.
if [ -n "$CLAUDE_PROJECT_DIR" ]; then
    find "$CLAUDE_PROJECT_DIR/.claude/hooks/state" -maxdepth 1 -type f -mtime +7 -delete 2>/dev/null || true
    find "$CLAUDE_PROJECT_DIR/.claude/tsc-cache" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
fi

# Skip doc indexing if disabled (also enforced in session-doc-updater.ts,
# which covers the case where the flag comes from .env)
if [ "$SESSION_DOCS_ENABLED" = "false" ]; then
    cat >/dev/null
    exit 0
fi

exec "$(dirname "$0")/_run-node-hook.sh" session-doc-updater.ts
