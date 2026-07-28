#!/bin/bash
# Shared preamble for the Node-based hooks.
# Usage: _run-node-hook.sh <script.ts>  (hook JSON arrives on stdin)
set -e

SCRIPT_NAME="$1"

# Read stdin first (before any sourcing that might consume it)
INPUT=$(cat)

# Skip silently if not running under Claude Code
if [ -z "$CLAUDE_PROJECT_DIR" ]; then
    exit 0
fi

HOOKS_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks"

# Source bashrc to pick up API keys (GEMINI_API_KEY, OPENAI_API_KEY, etc.).
# All output is suppressed: UserPromptSubmit hook stdout is injected into
# Claude's context, so anything a user's bashrc prints must not leak through.
if [ -f ~/.bashrc ]; then
    source ~/.bashrc </dev/null >/dev/null 2>&1 || true
fi

# Source .env for API keys (reliable path for macOS/zsh users)
if [ -f "$HOOKS_DIR/.env" ]; then
    set -a
    source "$HOOKS_DIR/.env" >/dev/null 2>&1 || true
    set +a
fi

# Fail safe if dependencies are missing. tsx is invoked directly rather than
# through npx, which adds package-resolution latency on every hook call.
TSX_BIN="$HOOKS_DIR/node_modules/.bin/tsx"
if [ ! -x "$TSX_BIN" ]; then
    echo "claude hooks: dependencies not installed - run: cd .claude/hooks && npm install" >&2
    exit 0
fi

cd "$HOOKS_DIR"
echo "$INPUT" | "$TSX_BIN" "$SCRIPT_NAME"
