# Python DevSecOps Adaptation Guide

This document explains what was adapted from the original showcase for Python/DevSecOps work.

---

## What Was Created for You

### ✅ New Skills (Python-Specific)

#### 1. **python-dev-guidelines**
`claude/skills/python-dev-guidelines/`

**Purpose:** Python best practices for DevSecOps engineers

**Covers:**
- Type hints with modern syntax (3.9+, 3.10+)
- Error handling patterns
- Testing with pytest
- Logging patterns
- Dependency management (Poetry, pip-tools)
- Security practices (secrets, input validation)
- Code quality tools (ruff, mypy, black)

**Resource files included:**
- `typing-patterns.md` - Complete guide to Python type hints
- `security-practices.md` - Security best practices for Python
- More can be added: testing-patterns.md, project-structure.md, etc.

**Activates when:**
- Editing `.py` files
- Keywords: python, pytest, typing, mypy, ruff, pydantic, etc.
- Creating modules, functions, classes

---

#### 2. **shell-script-guidelines**
`claude/skills/shell-script-guidelines/`

**Purpose:** Shell scripting best practices for automation

**Covers:**
- Error handling (`set -euo pipefail`)
- Argument validation
- Logging functions
- Security practices (no hardcoded secrets)
- Safe command execution
- File operations
- Testing with shellcheck and BATS
- Complete examples

**Activates when:**
- Editing `.sh` files
- Keywords: bash, shell, script, automation
- Working on deployment/automation scripts

---

### ✅ New Hooks (Python-Specific)

#### 1. **python-lint-check.sh** (Stop hook)
`claude/hooks/python-lint-check.sh`

**Runs when you press Stop** and checks:
- ✓ ruff (linting + formatting)
- ✓ mypy (type checking)
- ✓ bandit (security issues)
- ✓ pip-audit (vulnerable dependencies)

**Non-blocking:** Shows warnings but doesn't prevent operations

**Install tools:**
```bash
pip install ruff mypy bandit pip-audit
```

---

#### 2. **security-check-reminder.sh** (Stop hook)
`claude/hooks/security-check-reminder.sh`

**Runs when you press Stop** and reminds you to check:
- No hardcoded secrets
- No passwords in code
- Environment variables for secrets
- Input validation
- No `shell=True` in subprocess
- File permissions correct
- Dependencies scanned

**Includes quick commands** for security scanning

---

### ✅ Adapted Configuration

#### **python-devsecops-skill-rules.json**
`claude/skills/python-devsecops-skill-rules.json`

**Configured for Python/DevSecOps work:**

Skills included:
- `skill-developer` - Meta-skill for creating skills
- `python-dev-guidelines` - Python best practices
- `shell-script-guidelines` - Shell scripting
- `security-practices` - Security guardrails
- `devops-automation` - Docker, K8s, Terraform, CI/CD

**Path patterns configured for:**
- Python files: `**/*.py`, `pyproject.toml`, `requirements.txt`
- Shell scripts: `**/*.sh`, `scripts/**`, `bin/**`
- IaC files: `Dockerfile`, `.github/workflows/`, `*.tf`, `ansible/`
- Config files: `.env`, `*.yaml`, `*.yml`

---

### ✅ Setup Script

#### **setup-devsecops-infrastructure.sh**
Root level script that automatically:
1. Creates `.claude/` directory structure
2. Copies essential hooks (skill-activation, post-tool-use-tracker)
3. Copies Python-specific hooks (lint, security)
4. Installs skills (skill-developer, python-dev, shell-script)
5. Copies reusable agents (7 generic agents)
6. Copies dev-docs commands
7. Creates settings.json with hook configurations
8. Verifies installation

**Usage:**
```bash
./setup-devsecops-infrastructure.sh /path/to/your/project
```

---

## What Was Kept (100% Reusable)

### ✅ Essential Hooks
- `skill-activation-prompt.*` - Auto-suggests skills
- `post-tool-use-tracker.sh` - Tracks file changes

### ✅ Skills
- `skill-developer/` - Meta-skill for creating skills

### ✅ Agents (All Generic)
- `code-architecture-reviewer.md`
- `code-refactor-master.md`
- `documentation-architect.md`
- `plan-reviewer.md`
- `refactor-planner.md`
- `web-research-specialist.md`
- `auto-error-resolver.md` (can adapt for Python)

### ✅ Commands
- `dev-docs.md` - Create dev documentation
- `dev-docs-update.md` - Update dev docs

### ✅ Dev Docs Pattern
Complete pattern for preserving context across sessions

---

## What Was Skipped (Not Relevant)

### ❌ Node.js/TypeScript Components
- `backend-dev-guidelines` - Express/Prisma specific
- `frontend-dev-guidelines` - React/MUI specific
- `tsc-check.sh` - TypeScript compiler check
- `trigger-build-resolver.sh` - TypeScript errors

### ❌ Frontend/JWT Auth Components
- `frontend-error-fixer` agent
- `auth-route-tester` agent
- `auth-route-debugger` agent
- `route-tester` skill

---

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# From the showcase directory
./setup-devsecops-infrastructure.sh /path/to/your/python/project

# Install Python dev tools
pip install ruff mypy bandit pip-audit pytest
```

### Option 2: Manual Setup

```bash
# 1. Copy essential infrastructure
cp -r claude/hooks/skill-activation-prompt.* your-project/.claude/hooks/
cp -r claude/hooks/post-tool-use-tracker.sh your-project/.claude/hooks/
chmod +x your-project/.claude/hooks/*.sh

# 2. Copy Python-specific components
cp -r claude/hooks/python-lint-check.sh your-project/.claude/hooks/
cp -r claude/hooks/security-check-reminder.sh your-project/.claude/hooks/
chmod +x your-project/.claude/hooks/*.sh

# 3. Copy skills
cp -r claude/skills/skill-developer your-project/.claude/skills/
cp -r claude/skills/python-dev-guidelines your-project/.claude/skills/
cp -r claude/skills/shell-script-guidelines your-project/.claude/skills/

# 4. Copy skill-rules.json
cp claude/skills/python-devsecops-skill-rules.json your-project/.claude/skills/skill-rules.json

# 5. Install hook dependencies
cd your-project/.claude/hooks
npm install

# 6. Create settings.json (see example below)
```

---

## Settings.json Configuration

Add this to your `.claude/settings.json`:

```json
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
```

---

## Testing the Setup

### 1. Test Python Skill Activation

Create a test Python file:
```bash
touch test.py
# Edit it in Claude Code
# python-dev-guidelines should auto-suggest
```

### 2. Test Shell Skill Activation

Create a test shell script:
```bash
touch deploy.sh
# Edit it in Claude Code
# shell-script-guidelines should auto-suggest
```

### 3. Test Python Lint Hook

```bash
# Create a Python file with issues
echo "import os; password = 'secret123'" > bad.py

# Press Stop in Claude Code
# Should see warnings from ruff, bandit, etc.
```

### 4. Test Dev Docs

```bash
# In Claude Code
/dev-docs implement-api-endpoint

# Should create dev docs structure
```

---

## Customization Guide

### Update Path Patterns

Edit `.claude/skills/skill-rules.json`:

```json
{
  "python-dev-guidelines": {
    "fileTriggers": {
      "pathPatterns": [
        "src/**/*.py",           // Your Python source
        "scripts/**/*.py",        // Your scripts
        "lib/**/*.py",            // Your libraries
        "pyproject.toml"
      ]
    }
  }
}
```

### Add Custom Keywords

```json
{
  "python-dev-guidelines": {
    "promptTriggers": {
      "keywords": [
        "python",
        "pytest",
        "your-framework-name",    // Add your frameworks
        "your-library-name"       // Add your libraries
      ]
    }
  }
}
```

### Disable Optional Hooks

Remove from settings.json if you don't want:
- `python-lint-check.sh` - If you don't use ruff/mypy
- `security-check-reminder.sh` - If too noisy

---

## Additional Skills You Can Create

Use the `skill-developer` skill to create:

### 1. Infrastructure-as-Code Skills
```
/skill-developer create terraform-guidelines
/skill-developer create ansible-guidelines
/skill-developer create kubernetes-guidelines
```

### 2. Cloud Provider Skills
```
/skill-developer create aws-guidelines
/skill-developer create gcp-guidelines
/skill-developer create azure-guidelines
```

### 3. CI/CD Skills
```
/skill-developer create github-actions-guidelines
/skill-developer create gitlab-ci-guidelines
/skill-developer create jenkins-guidelines
```

### 4. Container Skills
```
/skill-developer create dockerfile-guidelines
/skill-developer create docker-compose-guidelines
```

---

## Tools to Install

### Required
```bash
pip install ruff mypy pytest
```

### Recommended
```bash
pip install bandit pip-audit black isort
```

### Optional
```bash
pip install pytest-cov pytest-mock hypothesis
```

---

## File Structure After Setup

```
your-project/
├── .claude/
│   ├── skills/
│   │   ├── skill-developer/       # Meta-skill
│   │   ├── python-dev-guidelines/ # Python skill
│   │   ├── shell-script-guidelines/ # Shell skill
│   │   └── skill-rules.json       # Python/DevSecOps config
│   ├── hooks/
│   │   ├── skill-activation-prompt.* # Essential
│   │   ├── post-tool-use-tracker.sh  # Essential
│   │   ├── python-lint-check.sh      # Python-specific
│   │   ├── security-check-reminder.sh # Security
│   │   ├── package.json
│   │   └── node_modules/
│   ├── agents/
│   │   ├── code-architecture-reviewer.md
│   │   ├── code-refactor-master.md
│   │   └── ... (7 agents)
│   ├── commands/
│   │   ├── dev-docs.md
│   │   └── dev-docs-update.md
│   └── settings.json
├── src/
│   └── your_python_code.py
└── scripts/
    └── your_shell_scripts.sh
```

---

## Next Steps

1. **Run the setup script**
   ```bash
   ./setup-devsecops-infrastructure.sh ~/your-project
   ```

2. **Install Python tools**
   ```bash
   pip install ruff mypy bandit pip-audit pytest
   ```

3. **Test skill activation**
   - Edit a `.py` file
   - Ask Claude about Python
   - Should see skill suggestions

4. **Customize for your stack**
   - Update skill-rules.json pathPatterns
   - Add your framework/library keywords
   - Create additional skills as needed

5. **Use dev-docs for complex tasks**
   ```bash
   /dev-docs my-first-feature
   ```

---

## Troubleshooting

### Skills not activating?
- Check `.claude/skills/skill-rules.json` exists
- Verify hooks are executable: `ls -la .claude/hooks/*.sh`
- Check hook dependencies: `cd .claude/hooks && npm install`

### Hooks not running?
- Verify settings.json syntax: `cat .claude/settings.json | jq .`
- Check hook output: Run hooks manually to test

### Python tools not found?
- Install: `pip install ruff mypy bandit pip-audit`
- Verify: `which ruff mypy bandit pip-audit`

---

## Questions?

Reference the original showcase documentation:
- `README.md` - Overview
- `CLAUDE_INTEGRATION_GUIDE.md` - Integration details
- `claude/skills/README.md` - Skills guide
- `claude/hooks/README.md` - Hooks guide

Or ask me! I can help with:
- Creating additional skills for your stack
- Customizing skill-rules.json
- Adapting agents for Python
- Setting up additional hooks
