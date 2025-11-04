#!/usr/bin/env bash
###############################################################################
# Hook: security-check-reminder.sh
# Type: Stop
# Description: Remind about security best practices for DevSecOps
# Usage: Automatically runs when user presses Stop in Claude Code
###############################################################################

set -euo pipefail

# Colors
readonly YELLOW='\033[0;33m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Check if we modified any Python or shell files
check_modified_files() {
    # Check git status for staged/unstaged changes
    if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
        git status --short | grep -E '\.(py|sh|yaml|yml|json|env)$' || true
    fi
}

# Check if we're in a code project
has_code_files() {
    find . -maxdepth 3 -name "*.py" -o -name "*.sh" 2>/dev/null | grep -q . || return 1
}

# Only run if we have code files
if ! has_code_files; then
    exit 0
fi

# Check if files were actually modified
MODIFIED_FILES=$(check_modified_files)

if [[ -z "${MODIFIED_FILES}" ]]; then
    exit 0
fi

echo ""
echo -e "${CYAN}🔒 Security Checklist Reminder${NC}"
echo ""
echo "Before committing, verify:"
echo ""
echo "  [ ] No hardcoded secrets or API keys"
echo "  [ ] No passwords in code or comments"
echo "  [ ] Environment variables used for secrets"
echo "  [ ] Input validation on external data"
echo "  [ ] No shell=True in subprocess calls (Python)"
echo "  [ ] File permissions set correctly (chmod 600 for secrets)"
echo "  [ ] Dependencies scanned for vulnerabilities"
echo "  [ ] Error messages don't leak sensitive info"
echo "  [ ] Using HTTPS for external communications"
echo ""
echo -e "${YELLOW}Quick security scan:${NC}"
echo "  # Search for potential secrets"
echo "  git diff | grep -iE '(password|api[_-]?key|secret|token) ?[:=]'"
echo ""
echo "  # Check for suspicious patterns"
echo "  bandit -r . -ll"
echo ""
echo "  # Scan dependencies"
echo "  pip-audit"
echo ""

exit 0
