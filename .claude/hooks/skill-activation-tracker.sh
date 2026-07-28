#!/bin/bash
# PostToolUse hook (Skill) - clears activated skills from pending lists
exec "$(dirname "$0")/_run-node-hook.sh" skill-activation-tracker.ts
