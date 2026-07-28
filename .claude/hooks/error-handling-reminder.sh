#!/bin/bash
# Optional Stop hook - error-handling self-check reminder

# Skip if environment variable is set
if [ -n "$SKIP_ERROR_REMINDER" ]; then
    cat >/dev/null
    exit 0
fi

exec "$(dirname "$0")/_run-node-hook.sh" error-handling-reminder.ts
