#!/bin/bash
# UserPromptSubmit hook - skill suggestions + session intelligence
exec "$(dirname "$0")/_run-node-hook.sh" skill-activation-prompt.ts
