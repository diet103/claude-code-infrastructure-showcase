#!/bin/bash

# TSC Hook with Visible Output
# Uses stderr for visibility in Claude Code main interface

HOOK_INPUT=$(cat)

# Skip silently if not running under Claude Code
if [ -z "$CLAUDE_PROJECT_DIR" ]; then
    exit 0
fi

# jq is required to parse hook input
if ! command -v jq >/dev/null 2>&1; then
    echo "claude hooks: jq is required for this hook - install jq or remove the hook from settings.json" >&2
    exit 0
fi

# Session id arrives in the hook's stdin JSON (Claude Code sets no session env var)
SESSION_ID=$(echo "$HOOK_INPUT" | jq -r '.session_id // "default"')
CACHE_DIR="$HOME/.claude/tsc-cache/$SESSION_ID"

# Create cache directory
mkdir -p "$CACHE_DIR"

# Extract tool name and input
TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // ""')
TOOL_INPUT=$(echo "$HOOK_INPUT" | jq -r '.tool_input // {}')

# Function to get repo for a file: any top-level directory with a tsconfig.json
# counts as a checkable repo.
# CUSTOMIZE: to restrict checks to specific services, add a case statement here,
# e.g.:  case "$repo" in email|exports|form) ;; *) echo ""; return 1 ;; esac
get_repo_for_file() {
    local file_path="$1"
    local relative_path="${file_path#$CLAUDE_PROJECT_DIR/}"

    if [[ "$relative_path" =~ ^([^/]+)/ ]]; then
        local repo="${BASH_REMATCH[1]}"
        if [ -f "$CLAUDE_PROJECT_DIR/$repo/tsconfig.json" ]; then
            echo "$repo"
            return 0
        fi
    fi
    echo ""
    return 1
}

# Function to detect the correct TSC command for a repo
get_tsc_command() {
    local repo_path="$1"
    cd "$repo_path" 2>/dev/null || return 1
    
    if [ -f "tsconfig.app.json" ]; then
        echo "npx tsc --project tsconfig.app.json --noEmit"
    elif [ -f "tsconfig.build.json" ]; then
        echo "npx tsc --project tsconfig.build.json --noEmit"
    elif [ -f "tsconfig.json" ]; then
        if grep -q '"references"' tsconfig.json 2>/dev/null; then
            if [ -f "tsconfig.app.json" ]; then
                echo "npx tsc --project tsconfig.app.json --noEmit"
            elif [ -f "tsconfig.src.json" ]; then
                echo "npx tsc --project tsconfig.src.json --noEmit"
            else
                echo "npx tsc --build --noEmit"
            fi
        else
            echo "npx tsc --noEmit"
        fi
    else
        echo "npx tsc --noEmit"
    fi
}

# Function to run TSC check
run_tsc_check() {
    local repo="$1"
    local repo_path="$CLAUDE_PROJECT_DIR/$repo"
    local cache_file="$CACHE_DIR/$repo-tsc-cmd.cache"
    
    cd "$repo_path" 2>/dev/null || return 1
    
    # Get or cache the TSC command for this repo
    local tsc_cmd
    if [ -f "$cache_file" ] && [ -z "$FORCE_DETECT" ]; then
        tsc_cmd=$(cat "$cache_file")
    else
        tsc_cmd=$(get_tsc_command "$repo_path")
        echo "$tsc_cmd" > "$cache_file"
    fi
    
    bash -c "$tsc_cmd" 2>&1
}

# Only process file modification tools
case "$TOOL_NAME" in
    Write|Edit|MultiEdit)
        # Extract file path (Edit, Write, and MultiEdit all carry a single
        # top-level file_path; MultiEdit's edits[] entries have no path)
        FILE_PATHS=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
        
        # Collect repos that need checking (only for TS/JS files)
        REPOS_TO_CHECK=$(echo "$FILE_PATHS" | grep -E '\.(ts|tsx|js|jsx)$' | while read -r file_path; do
            if [ -n "$file_path" ]; then
                repo=$(get_repo_for_file "$file_path")
                [ -n "$repo" ] && echo "$repo"
            fi
        done | sort -u | tr '\n' ' ')
        
        # Trim whitespace
        REPOS_TO_CHECK=$(echo "$REPOS_TO_CHECK" | xargs)
        
        if [ -n "$REPOS_TO_CHECK" ]; then
            ERROR_COUNT=0
            ERROR_OUTPUT=""
            FAILED_REPOS=""
            
            # Output to stderr for visibility
            echo "⚡ TypeScript check on: $REPOS_TO_CHECK" >&2
            
            for repo in $REPOS_TO_CHECK; do
                echo -n "  Checking $repo... " >&2
                
                # Run the check and capture output
                CHECK_OUTPUT=$(run_tsc_check "$repo" 2>&1)
                CHECK_EXIT_CODE=$?
                
                # Check for TypeScript errors in output
                if [ $CHECK_EXIT_CODE -ne 0 ] || echo "$CHECK_OUTPUT" | grep -q "error TS"; then
                    echo "❌ Errors found" >&2
                    ERROR_COUNT=$((ERROR_COUNT + 1))
                    FAILED_REPOS="$FAILED_REPOS $repo"
                    ERROR_OUTPUT="${ERROR_OUTPUT}

=== Errors in $repo ===
$CHECK_OUTPUT"
                else
                    echo "✅ OK" >&2
                fi
            done
            
            # If errors were found, show them and save for agent
            if [ $ERROR_COUNT -gt 0 ]; then
                # Save error information for the agent
                echo "$ERROR_OUTPUT" > "$CACHE_DIR/last-errors.txt"
                echo "$FAILED_REPOS" > "$CACHE_DIR/affected-repos.txt"
                
                # Save the TSC commands used for each repo
                echo "# TSC Commands by Repo" > "$CACHE_DIR/tsc-commands.txt"
                for repo in $FAILED_REPOS; do
                    cmd=$(cat "$CACHE_DIR/$repo-tsc-cmd.cache" 2>/dev/null || echo "npx tsc --noEmit")
                    echo "$repo: $cmd" >> "$CACHE_DIR/tsc-commands.txt"
                done
                
                # Output to stderr for visibility
                {
                    echo ""
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    echo "🚨 TypeScript errors found in $ERROR_COUNT repo(s): $FAILED_REPOS"
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    echo ""
                    echo "👉 IMPORTANT: Use the auto-error-resolver agent to fix the errors"
                    echo ""
                    echo "WE DO NOT LEAVE A MESS BEHIND"
                    echo "Error Preview:"
                    echo "$ERROR_OUTPUT" | grep "error TS" | head -10
                    echo ""
                    if [ $(echo "$ERROR_OUTPUT" | grep -c "error TS") -gt 10 ]; then
                        echo "... and $(($(echo "$ERROR_OUTPUT" | grep -c "error TS") - 10)) more errors"
                    fi
                } >&2
                
                # Exit with code 2 to feed the errors back to Claude
                exit 2
            fi
        fi
        ;;
esac

# Cleanup old cache directories (older than 7 days)
find "$HOME/.claude/tsc-cache" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

exit 0