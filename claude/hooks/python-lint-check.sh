#!/usr/bin/env bash
###############################################################################
# Hook: python-lint-check.sh
# Type: Stop
# Description: Run Python linting and type checking when user stops
# Usage: Automatically runs when user presses Stop in Claude Code
###############################################################################

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly YELLOW='\033[0;33m'
readonly GREEN='\033[0;32m'
readonly NC='\033[0m' # No Color

# Check if we're in a Python project
has_python_files() {
    find . -maxdepth 3 -name "*.py" -type f 2>/dev/null | grep -q .
}

# Only run if we have Python files
if ! has_python_files; then
    exit 0
fi

echo -e "${GREEN}🐍 Running Python quality checks...${NC}"
echo ""

# Track if any checks failed
FAILED=0

# 1. Ruff (fast linter + formatter)
if command -v ruff &> /dev/null; then
    echo "▶ Running ruff..."
    if ruff check . --quiet; then
        echo -e "${GREEN}  ✓ Ruff: No issues${NC}"
    else
        echo -e "${YELLOW}  ⚠ Ruff found issues${NC}"
        echo "    Run: ruff check . --fix"
        FAILED=1
    fi
    echo ""
fi

# 2. MyPy (type checking)
if command -v mypy &> /dev/null; then
    echo "▶ Running mypy..."
    if mypy . --no-error-summary 2>/dev/null; then
        echo -e "${GREEN}  ✓ MyPy: Type checks passed${NC}"
    else
        echo -e "${YELLOW}  ⚠ MyPy found type errors${NC}"
        echo "    Run: mypy . (for details)"
        FAILED=1
    fi
    echo ""
fi

# 3. Bandit (security checks)
if command -v bandit &> /dev/null; then
    echo "▶ Running bandit (security)..."
    if bandit -r . -ll -q 2>/dev/null; then
        echo -e "${GREEN}  ✓ Bandit: No security issues${NC}"
    else
        echo -e "${RED}  ⚠ Bandit found security issues${NC}"
        echo "    Run: bandit -r . (for details)"
        FAILED=1
    fi
    echo ""
fi

# 4. pip-audit (dependency vulnerabilities)
if command -v pip-audit &> /dev/null; then
    echo "▶ Running pip-audit (dependencies)..."
    if pip-audit --quiet 2>/dev/null; then
        echo -e "${GREEN}  ✓ pip-audit: No vulnerable dependencies${NC}"
    else
        echo -e "${RED}  ⚠ pip-audit found vulnerabilities${NC}"
        echo "    Run: pip-audit --desc (for details)"
        FAILED=1
    fi
    echo ""
fi

# Summary
if [[ ${FAILED} -eq 0 ]]; then
    echo -e "${GREEN}✓ All Python quality checks passed!${NC}"
else
    echo -e "${YELLOW}⚠ Some checks failed. Review and fix before committing.${NC}"
    echo ""
    echo "Install missing tools:"
    echo "  pip install ruff mypy bandit pip-audit"
fi

echo ""

exit 0
