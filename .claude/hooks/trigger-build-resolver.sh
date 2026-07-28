#!/bin/bash

# Debug log lives inside the project (fall back to /tmp if CLAUDE_PROJECT_DIR is unset)
if [ -n "$CLAUDE_PROJECT_DIR" ]; then
    DEBUG_LOG="$CLAUDE_PROJECT_DIR/.claude/hooks/debug.log"
else
    DEBUG_LOG="/tmp/claude-hook-debug.log"
fi

# Cap the log at ~1MB - truncate before appending
if [ -f "$DEBUG_LOG" ] && [ "$(wc -c < "$DEBUG_LOG")" -gt 1048576 ]; then
    : > "$DEBUG_LOG"
fi

echo "Hook triggered at $(date)" >> "$DEBUG_LOG"
echo "Args: $@" >> "$DEBUG_LOG"
echo "Stdin:" >> "$DEBUG_LOG"
cat >> "$DEBUG_LOG"

# Add detailed debugging
echo "=== DEBUG SECTION ===" >> "$DEBUG_LOG"
echo "CLAUDE_PROJECT_DIR: $CLAUDE_PROJECT_DIR" >> "$DEBUG_LOG"
echo "Current working directory: $(pwd)" >> "$DEBUG_LOG"

# Define the service directories to check
services_dirs=("email" "exports" "form" "frontend" "projects" "uploads" "users" "utilities" "events" "database")
services_with_changes=()

# Check each service directory for git changes
for service in "${services_dirs[@]}"; do
    service_path="$CLAUDE_PROJECT_DIR/$service"
    echo "Checking service: $service at $service_path" >> "$DEBUG_LOG"
    
    # Check if directory exists and is a git repo
    if [ -d "$service_path" ] && [ -d "$service_path/.git" ]; then
        echo "  -> Is a git repository" >> "$DEBUG_LOG"
        
        # Check for changes in this specific repo
        cd "$service_path"
        git_status=$(git status --porcelain 2>/dev/null)
        
        if [ -n "$git_status" ]; then
            echo "  -> Has changes:" >> "$DEBUG_LOG"
            echo "$git_status" | sed 's/^/    /' >> "$DEBUG_LOG"
            services_with_changes+=("$service")
        else
            echo "  -> No changes" >> "$DEBUG_LOG"
        fi
    else
        echo "  -> Not a git repository or doesn't exist" >> "$DEBUG_LOG"
    fi
done

# Return to original directory
cd "$CLAUDE_PROJECT_DIR"

echo "Services with changes: ${services_with_changes[@]}" >> "$DEBUG_LOG"

if [[ ${#services_with_changes[@]} -gt 0 ]]; then
    services_list=$(IFS=', '; echo "${services_with_changes[*]}")
    echo "Changes detected in: $services_list — triggering auto-error-resolver..." >> "$DEBUG_LOG"
    echo "Changes detected in: $services_list — triggering auto-error-resolver..." >&2

    # Use the correct Claude CLI syntax - try different options
    echo "Attempting to run claude with sub-agent..." >> "$DEBUG_LOG"
    
    # Try different possible syntaxes for sub-agents
    if command -v claude >/dev/null 2>&1; then
        # Option 1: Try direct agent invocation
        claude --agent auto-error-resolver <<EOF 2>> "$DEBUG_LOG"
Build and fix errors in these specific services only: ${services_list}

Focus on these services in the monorepo structure. Each service has its own build process.
EOF
        
        # If that fails, try alternative syntax
        if [ $? -ne 0 ]; then
            echo "First attempt failed, trying alternative syntax..." >> "$DEBUG_LOG"
            claude chat "Use the auto-error-resolver agent to build and fix errors in: ${services_list}" 2>> "$DEBUG_LOG"
        fi
    else
        echo "Claude CLI not found in PATH" >> "$DEBUG_LOG"
    fi
    
    echo "Claude command completed with exit code: $?" >> "$DEBUG_LOG"
else
    echo "No services with changes detected — skipping auto-error-resolver." >> "$DEBUG_LOG"
    echo "No services with changes detected — skipping auto-error-resolver." >&2
fi

echo "=== END DEBUG SECTION ===" >> "$DEBUG_LOG"
exit 0