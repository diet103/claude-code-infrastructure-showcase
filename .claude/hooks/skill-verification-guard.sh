#!/bin/bash
# PreToolUse hook (Edit|MultiEdit|Write) - mandatory skill enforcement + guardrails
exec "$(dirname "$0")/_run-node-hook.sh" skill-verification-guard.ts
