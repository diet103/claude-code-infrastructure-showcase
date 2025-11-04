#!/usr/bin/env bash
###############################################################################
# setup-devsecops-infrastructure.sh
# Description: Setup Claude Code infrastructure for Python DevSecOps projects
# Author: Adapted from claude-code-infrastructure-showcase
# Usage: ./setup-devsecops-infrastructure.sh <target-project-directory>
###############################################################################

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Script directory (where this script and showcase files are)
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SHOWCASE_DIR="${SCRIPT_DIR}"

# Target directory
TARGET_DIR="${1:-.}"
TARGET_DIR="$(cd "${TARGET_DIR}" && pwd)"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Claude Code DevSecOps Infrastructure Setup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

log_info() {
    echo -e "${GREEN}✓${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
    exit 1
}

# Validate target directory
if [[ ! -d "${TARGET_DIR}" ]]; then
    log_error "Target directory does not exist: ${TARGET_DIR}"
fi

echo "Target project: ${TARGET_DIR}"
echo ""

# Create directory structure
echo "Creating directory structure..."
mkdir -p "${TARGET_DIR}/.claude/skills"
mkdir -p "${TARGET_DIR}/.claude/hooks"
mkdir -p "${TARGET_DIR}/.claude/agents"
mkdir -p "${TARGET_DIR}/.claude/commands"
log_info "Directories created"
echo ""

# Copy essential hooks
echo "Installing essential hooks..."
if [[ -f "${SHOWCASE_DIR}/claude/hooks/skill-activation-prompt.sh" ]]; then
    cp "${SHOWCASE_DIR}/claude/hooks/skill-activation-prompt.sh" "${TARGET_DIR}/.claude/hooks/"
    cp "${SHOWCASE_DIR}/claude/hooks/skill-activation-prompt.ts" "${TARGET_DIR}/.claude/hooks/"
    chmod +x "${TARGET_DIR}/.claude/hooks/skill-activation-prompt.sh"
    log_info "skill-activation-prompt hook installed"
else
    log_warn "skill-activation-prompt files not found - skipping"
fi

if [[ -f "${SHOWCASE_DIR}/claude/hooks/post-tool-use-tracker.sh" ]]; then
    cp "${SHOWCASE_DIR}/claude/hooks/post-tool-use-tracker.sh" "${TARGET_DIR}/.claude/hooks/"
    chmod +x "${TARGET_DIR}/.claude/hooks/post-tool-use-tracker.sh"
    log_info "post-tool-use-tracker hook installed"
else
    log_warn "post-tool-use-tracker hook not found - skipping"
fi
echo ""

# Copy Python-specific hooks
echo "Installing Python-specific hooks..."
if [[ -f "${SHOWCASE_DIR}/claude/hooks/python-lint-check.sh" ]]; then
    cp "${SHOWCASE_DIR}/claude/hooks/python-lint-check.sh" "${TARGET_DIR}/.claude/hooks/"
    chmod +x "${TARGET_DIR}/.claude/hooks/python-lint-check.sh"
    log_info "python-lint-check hook installed"
else
    log_warn "python-lint-check hook not found - skipping"
fi

if [[ -f "${SHOWCASE_DIR}/claude/hooks/security-check-reminder.sh" ]]; then
    cp "${SHOWCASE_DIR}/claude/hooks/security-check-reminder.sh" "${TARGET_DIR}/.claude/hooks/"
    chmod +x "${TARGET_DIR}/.claude/hooks/security-check-reminder.sh"
    log_info "security-check-reminder hook installed"
else
    log_warn "security-check-reminder hook not found - skipping"
fi
echo ""

# Install hook dependencies
echo "Installing hook dependencies..."
if [[ -f "${SHOWCASE_DIR}/claude/hooks/package.json" ]]; then
    cp "${SHOWCASE_DIR}/claude/hooks/package.json" "${TARGET_DIR}/.claude/hooks/"
    cd "${TARGET_DIR}/.claude/hooks"
    if command -v npm &> /dev/null; then
        npm install --silent
        log_info "Hook dependencies installed"
    else
        log_warn "npm not found - install Node.js and run: cd .claude/hooks && npm install"
    fi
    cd "${TARGET_DIR}"
else
    log_warn "package.json not found - skipping dependency installation"
fi
echo ""

# Copy skills
echo "Installing skills..."

# skill-developer (essential meta-skill)
if [[ -d "${SHOWCASE_DIR}/claude/skills/skill-developer" ]]; then
    cp -r "${SHOWCASE_DIR}/claude/skills/skill-developer" "${TARGET_DIR}/.claude/skills/"
    log_info "skill-developer skill installed"
else
    log_warn "skill-developer not found - skipping"
fi

# python-dev-guidelines (Python skill)
if [[ -d "${SHOWCASE_DIR}/claude/skills/python-dev-guidelines" ]]; then
    cp -r "${SHOWCASE_DIR}/claude/skills/python-dev-guidelines" "${TARGET_DIR}/.claude/skills/"
    log_info "python-dev-guidelines skill installed"
else
    log_warn "python-dev-guidelines not found - skipping"
fi

# shell-script-guidelines (Shell skill)
if [[ -d "${SHOWCASE_DIR}/claude/skills/shell-script-guidelines" ]]; then
    cp -r "${SHOWCASE_DIR}/claude/skills/shell-script-guidelines" "${TARGET_DIR}/.claude/skills/"
    log_info "shell-script-guidelines skill installed"
else
    log_warn "shell-script-guidelines not found - skipping"
fi

# error-tracking (if using Sentry)
if [[ -d "${SHOWCASE_DIR}/claude/skills/error-tracking" ]]; then
    cp -r "${SHOWCASE_DIR}/claude/skills/error-tracking" "${TARGET_DIR}/.claude/skills/"
    log_info "error-tracking skill installed (optional)"
else
    log_warn "error-tracking not found - skipping"
fi
echo ""

# Copy skill-rules.json
echo "Installing skill-rules.json..."
if [[ -f "${SHOWCASE_DIR}/claude/skills/python-devsecops-skill-rules.json" ]]; then
    cp "${SHOWCASE_DIR}/claude/skills/python-devsecops-skill-rules.json" "${TARGET_DIR}/.claude/skills/skill-rules.json"
    log_info "skill-rules.json installed (Python/DevSecOps optimized)"
else
    log_warn "skill-rules.json not found - create manually"
fi
echo ""

# Copy reusable agents
echo "Installing agents..."
AGENTS=(
    "code-architecture-reviewer.md"
    "code-refactor-master.md"
    "documentation-architect.md"
    "plan-reviewer.md"
    "refactor-planner.md"
    "web-research-specialist.md"
    "auto-error-resolver.md"
)

for agent in "${AGENTS[@]}"; do
    if [[ -f "${SHOWCASE_DIR}/claude/agents/${agent}" ]]; then
        cp "${SHOWCASE_DIR}/claude/agents/${agent}" "${TARGET_DIR}/.claude/agents/"
        log_info "${agent} installed"
    fi
done
echo ""

# Copy commands
echo "Installing commands..."
COMMANDS=(
    "dev-docs.md"
    "dev-docs-update.md"
)

for command in "${COMMANDS[@]}"; do
    if [[ -f "${SHOWCASE_DIR}/claude/commands/${command}" ]]; then
        cp "${SHOWCASE_DIR}/claude/commands/${command}" "${TARGET_DIR}/.claude/commands/"
        log_info "${command} installed"
    fi
done
echo ""

# Create settings.json if it doesn't exist
echo "Configuring settings.json..."
if [[ ! -f "${TARGET_DIR}/.claude/settings.json" ]]; then
    cat > "${TARGET_DIR}/.claude/settings.json" << 'EOF'
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/skill-activation-prompt.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/post-tool-use-tracker.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/python-lint-check.sh"
          },
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/security-check-reminder.sh"
          }
        ]
      }
    ]
  }
}
EOF
    log_info "settings.json created"
else
    log_warn "settings.json already exists - merge configurations manually"
    echo "    Add these hook configurations to your existing settings.json:"
    echo ""
    echo "    UserPromptSubmit: .claude/hooks/skill-activation-prompt.sh"
    echo "    PostToolUse: .claude/hooks/post-tool-use-tracker.sh"
    echo "    Stop: .claude/hooks/python-lint-check.sh"
    echo "    Stop: .claude/hooks/security-check-reminder.sh"
fi
echo ""

# Create .gitignore for .claude directory
echo "Configuring .gitignore..."
if [[ ! -f "${TARGET_DIR}/.claude/.gitignore" ]]; then
    cat > "${TARGET_DIR}/.claude/.gitignore" << 'EOF'
# Node modules for hooks
hooks/node_modules/
hooks/package-lock.json

# Local settings
settings.local.json

# Cache files
*.cache
.DS_Store
EOF
    log_info ".claude/.gitignore created"
fi
echo ""

# Verification
echo -e "${CYAN}Verifying installation...${NC}"
echo ""

# Check hooks are executable
echo "Checking hooks..."
for hook in "${TARGET_DIR}/.claude/hooks"/*.sh; do
    if [[ -x "${hook}" ]]; then
        echo -e "  ${GREEN}✓${NC} $(basename "${hook}") is executable"
    else
        echo -e "  ${RED}✗${NC} $(basename "${hook}") is NOT executable"
    fi
done
echo ""

# Check skills exist
echo "Checking skills..."
for skill in "${TARGET_DIR}/.claude/skills"/*; do
    if [[ -d "${skill}" ]]; then
        echo -e "  ${GREEN}✓${NC} $(basename "${skill}") installed"
    fi
done
echo ""

# Summary
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✓ Installation Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "What was installed:"
echo "  • Essential hooks (skill-activation, post-tool-use-tracker)"
echo "  • Python hooks (lint-check, security-reminder)"
echo "  • Skills (skill-developer, python-dev-guidelines, shell-script-guidelines)"
echo "  • Agents (7 generic agents)"
echo "  • Commands (dev-docs, dev-docs-update)"
echo ""
echo "Next steps:"
echo "  1. Install Python dev tools:"
echo "     pip install ruff mypy bandit pip-audit pytest"
echo ""
echo "  2. Test skill activation:"
echo "     • Edit a .py file - python-dev-guidelines should activate"
echo "     • Edit a .sh file - shell-script-guidelines should activate"
echo ""
echo "  3. Customize skill-rules.json if needed:"
echo "     • Update pathPatterns to match your project structure"
echo "     • Add domain-specific keywords"
echo ""
echo "  4. Try the dev-docs command:"
echo "     /dev-docs my-first-task"
echo ""
echo "Documentation:"
echo "  • Skills: .claude/skills/README.md (from showcase)"
echo "  • Hooks: .claude/hooks/README.md (from showcase)"
echo "  • CLAUDE_INTEGRATION_GUIDE.md (from showcase)"
echo ""
echo -e "${GREEN}Happy coding!${NC}"
