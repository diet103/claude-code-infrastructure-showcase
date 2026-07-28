#!/bin/bash
# verify-setup.sh - one-command health check for the Claude Code infrastructure.
#
# Usage (from anywhere inside your project):
#   bash .claude/scripts/verify-setup.sh
#
# Checks the skill auto-activation system end-to-end and prints an exact fix
# command for anything broken.
#
# Exit code: 0 = no failures (warnings allowed), 1 = at least one [FAIL].
#
# [FAIL] = core skill activation is broken
# [WARN] = an optional feature is degraded (session intelligence, file tracking,
#          AI classification falling back to regex) - everything else still works
#
# Note: the end-to-end check pipes a test prompt through the real activation
# hook, which may write throwaway state under .claude/hooks/state - harmless.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLAUDE_DIR="$PROJECT_ROOT/.claude"
HOOKS_DIR="$CLAUDE_DIR/hooks"
SETTINGS="$CLAUDE_DIR/settings.json"
RULES="$CLAUDE_DIR/skills/skill-rules.json"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

pass() {
    PASS_COUNT=$((PASS_COUNT + 1))
    echo "  [PASS] $1"
}

warn() {
    WARN_COUNT=$((WARN_COUNT + 1))
    echo "  [WARN] $1"
    [ -n "$2" ] && echo "         fix: $2"
}

fail() {
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "  [FAIL] $1"
    [ -n "$2" ] && echo "         fix: $2"
}

echo ""
echo "Claude Code infrastructure health check"
echo "Project: $PROJECT_ROOT"
echo ""

# ---- 1. Node version ----
if command -v node >/dev/null 2>&1; then
    NODE_MAJOR=$(node -p 'parseInt(process.versions.node, 10)' 2>/dev/null)
    if [ "${NODE_MAJOR:-0}" -ge 18 ]; then
        pass "Node $(node -v) (>= 18)"
    else
        fail "Node 18+ required, found $(node -v)" "install Node 20+ from https://nodejs.org"
    fi
else
    fail "node not found on PATH" "install Node 20+ from https://nodejs.org"
    echo ""
    echo "Result: cannot continue without Node. 1 check failed."
    exit 1
fi

# ---- 2. settings.json parses and registered hook scripts exist ----
if [ ! -f "$SETTINGS" ]; then
    fail ".claude/settings.json missing - no hooks will run" "re-run the setup wizard, or copy settings.json from the showcase repo"
elif ! node -e "JSON.parse(require('fs').readFileSync('$SETTINGS','utf8'))" 2>/dev/null; then
    fail ".claude/settings.json is not valid JSON - no hooks will run" "fix the syntax (a trailing comma is the usual culprit)"
else
    MISSING_HOOKS=$(node -e '
        const fs = require("fs");
        const s = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const root = process.argv[2];
        const missing = [];
        for (const matchers of Object.values(s.hooks || {})) {
            for (const m of matchers) {
                for (const h of (m.hooks || [])) {
                    if (!h.command) continue;
                    const cand = h.command.replace("$CLAUDE_PROJECT_DIR", root);
                    const p = fs.existsSync(cand) ? cand : cand.split(" ")[0];
                    if (!fs.existsSync(p)) missing.push(h.command);
                }
            }
        }
        console.log(missing.join("\n"));
    ' "$SETTINGS" "$PROJECT_ROOT" 2>/dev/null)
    if [ -z "$MISSING_HOOKS" ]; then
        pass "settings.json valid; all registered hook scripts exist"
    else
        fail "settings.json registers hook scripts that do not exist" "copy them from the showcase repo, or remove the dead registrations"
        echo "$MISSING_HOOKS" | sed 's/^/         missing: /'
    fi
fi

# ---- 3. Hook scripts are executable ----
NONEXEC=""
for f in "$HOOKS_DIR"/*.sh; do
    [ -e "$f" ] || continue
    [ -x "$f" ] || NONEXEC="$NONEXEC $(basename "$f")"
done
if [ -z "$NONEXEC" ]; then
    pass "all hook scripts are executable"
else
    fail "hook scripts missing the executable bit:$NONEXEC" "chmod +x $HOOKS_DIR/*.sh"
fi

# ---- 4. Hook dependencies ----
DEPS_OK=0
if [ -d "$HOOKS_DIR/node_modules" ]; then
    DEPS_OK=1
    pass "hook dependencies installed (node_modules present)"
    if node -e "require('$HOOKS_DIR/node_modules/better-sqlite3')" >/dev/null 2>&1; then
        pass "better-sqlite3 loads (session intelligence available)"
    else
        warn "better-sqlite3 failed to load - session intelligence is off (skill activation unaffected)" "cd $HOOKS_DIR && npm rebuild better-sqlite3"
    fi
else
    fail "hook dependencies not installed - skill activation will not run" "cd $HOOKS_DIR && npm install"
fi

# ---- 5. skill-rules.json ----
MODE="disabled"
if [ ! -f "$RULES" ]; then
    fail ".claude/skills/skill-rules.json missing - hooks have no trigger rules" "copy it from the showcase repo"
elif ! node -e "JSON.parse(require('fs').readFileSync('$RULES','utf8'))" 2>/dev/null; then
    fail "skill-rules.json is not valid JSON - skill matching is disabled" "fix the syntax"
else
    MODE=$(node -e "
        const r = JSON.parse(require('fs').readFileSync('$RULES','utf8'));
        console.log((r.settings || {}).skill_activation_mode || 'disabled');
    " 2>/dev/null)
    CONS=$(node -e "
        const r = JSON.parse(require('fs').readFileSync('$RULES','utf8'));
        console.log((r.settings || {}).conservativeness || 'balanced');
    " 2>/dev/null)
    RULES_OK=1
    case "$MODE" in
        disabled|fallback|ai-only) ;;
        *)
            fail "invalid skill_activation_mode \"$MODE\" in skill-rules.json" "set it to disabled, fallback, or ai-only"
            RULES_OK=0
            MODE="disabled"
            ;;
    esac
    case "$CONS" in
        strict|balanced|aggressive) ;;
        *)
            fail "invalid conservativeness \"$CONS\" in skill-rules.json" "set it to strict, balanced, or aggressive"
            RULES_OK=0
            ;;
    esac
    if [ "$RULES_OK" = "1" ]; then
        pass "skill-rules.json valid (mode: $MODE, conservativeness: $CONS)"
    fi
fi

# ---- 6. AI provider availability (only when an AI mode is enabled) ----
if [ "$MODE" != "disabled" ]; then
    if [ -f "$HOOKS_DIR/.env" ]; then
        set -a
        . "$HOOKS_DIR/.env" >/dev/null 2>&1
        set +a
    fi
    PROVIDER_OK=0
    if [ -n "$GEMINI_API_KEY" ] || [ -n "$OPENAI_API_KEY" ] || [ -n "$ANTHROPIC_API_KEY" ]; then
        PROVIDER_OK=1
    elif command -v curl >/dev/null 2>&1 && curl -s --max-time 2 "${OLLAMA_BASE_URL:-http://localhost:11434}/api/tags" >/dev/null 2>&1; then
        PROVIDER_OK=1
    fi
    if [ "$PROVIDER_OK" = "1" ]; then
        pass "AI mode ($MODE): a provider is available"
    elif [ "$MODE" = "ai-only" ]; then
        fail "mode is ai-only but no API key was found and Ollama is not running - there is no fallback" "cp .claude/hooks/.env.example .claude/hooks/.env and add a key (free Gemini key: https://aistudio.google.com/apikey), or set the mode to fallback"
    else
        warn "mode is fallback but no API key was found - regex matching will be used" "cp .claude/hooks/.env.example .claude/hooks/.env and add a key (free Gemini key: https://aistudio.google.com/apikey)"
    fi
fi

# ---- 7. jq (optional) ----
if command -v jq >/dev/null 2>&1; then
    pass "jq installed"
else
    warn "jq not installed - file tracking (post-tool-use-tracker) and the optional Stop build hooks will no-op" "install jq (apt install jq / brew install jq)"
fi

# ---- 8. End-to-end: fire a test prompt through the real activation hook ----
if [ "$DEPS_OK" = "1" ] && [ -x "$HOOKS_DIR/skill-activation-prompt.sh" ]; then
    RUNNER=""
    command -v timeout >/dev/null 2>&1 && RUNNER="timeout 30"
    # Unique session id per run - the hook deduplicates suggestions per session,
    # so a reused id would make every re-run look like a failure.
    E2E_SESSION="verify-setup-$$-$(date +%s 2>/dev/null || echo 0)"
    E2E_OUTPUT=$(printf '{"session_id":"%s","prompt":"create a new React component"}' "$E2E_SESSION" \
        | CLAUDE_PROJECT_DIR="$PROJECT_ROOT" $RUNNER bash "$HOOKS_DIR/skill-activation-prompt.sh" 2>/dev/null)
    rm -f "$HOOKS_DIR/state/skills-used-verify-setup-"*.json "$HOOKS_DIR/state/session-doc-verify-setup-"*.json 2>/dev/null
    if printf '%s' "$E2E_OUTPUT" | grep -q "frontend-dev-guidelines"; then
        pass "end-to-end: activation hook flagged frontend-dev-guidelines for a test prompt"
    elif [ "$MODE" != "disabled" ]; then
        warn "end-to-end: the AI classifier did not flag the expected skill (it may simply have judged differently)" "set skill_activation_mode to disabled and re-run to test the regex path"
    else
        fail "end-to-end: the activation hook produced no skill suggestion for a guaranteed-match prompt" "debug with: echo '{\"session_id\":\"t\",\"prompt\":\"create a new React component\"}' | DEBUG_SKILLS=1 bash $HOOKS_DIR/skill-activation-prompt.sh"
    fi
else
    fail "end-to-end check skipped - dependencies or the activation hook are missing (see failures above)" "fix the failures above, then re-run"
fi

# ---- 9. Cross-agent skills mirror (.agents/skills, read by Codex etc.) ----
if [ -d "$PROJECT_ROOT/.agents/skills" ]; then
    if bash "$PROJECT_ROOT/.claude/scripts/sync-agent-skills.sh" --check >/dev/null 2>&1; then
        pass "cross-agent mirror: .agents/skills matches .claude/skills"
    else
        warn ".agents/skills has drifted from .claude/skills - Codex and other Agent-Skills tools see stale skill content" "run .claude/scripts/sync-agent-skills.sh"
    fi
fi

# ---- Summary ----
echo ""
TOTAL=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))
echo "Result: $PASS_COUNT passed, $WARN_COUNT warning(s), $FAIL_COUNT failed (of $TOTAL checks)"
if [ "$FAIL_COUNT" -gt 0 ]; then
    echo "Fix the [FAIL] items above, then re-run: bash .claude/scripts/verify-setup.sh"
    exit 1
fi
echo "Skill auto-activation is ready."
exit 0
