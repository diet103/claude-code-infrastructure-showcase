# Hooks

Claude Code hooks that enable skill auto-activation, file tracking, and validation.

---

## What Are Hooks?

Hooks are scripts that run at specific points in Claude's workflow:
- **UserPromptSubmit**: When user submits a prompt
- **PreToolUse**: Before a tool executes  
- **PostToolUse**: After a tool completes
- **Stop**: When user requests to stop

**Key insight:** Hooks can modify prompts, block actions, and track state - enabling features Claude can't do alone.

---

## Essential Hooks (Start Here)

### skill-activation-prompt (UserPromptSubmit)

**Purpose:** Automatically suggests relevant skills based on user prompts and file context

**How it works:**
1. Reads `skill-rules.json`
2. Matches user prompt against trigger patterns
3. Checks which files user is working with
4. Injects skill suggestions into Claude's context

**Why it's essential:** This is THE hook that makes skills auto-activate.

**Integration:**
```bash
# Copy both files
cp skill-activation-prompt.sh your-project/.claude/hooks/
cp skill-activation-prompt.ts your-project/.claude/hooks/

# Make executable
chmod +x your-project/.claude/hooks/skill-activation-prompt.sh

# Install dependencies
cd your-project/.claude/hooks
npm install
```

**Add to settings.json:**
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
    ]
  }
}
```

**Customization:** ✅ None needed - reads skill-rules.json automatically

---

### post-tool-use-tracker (PostToolUse)

**Purpose:** Tracks file changes to maintain context across sessions

**How it works:**
1. Monitors Edit/Write/MultiEdit tool calls
2. Records which files were modified
3. Creates cache for context management
4. Auto-detects project structure (frontend, backend, packages, etc.)

**Why it's essential:** Helps Claude understand what parts of your codebase are active.

**Integration:**
```bash
# Copy file
cp post-tool-use-tracker.sh your-project/.claude/hooks/

# Make executable
chmod +x your-project/.claude/hooks/post-tool-use-tracker.sh
```

**Add to settings.json:**
```json
{
  "hooks": {
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
    ]
  }
}
```

**Customization:** ✅ None needed - auto-detects structure

---

### skill-verification-guard (PreToolUse)

**Purpose:** Enforces mandatory skill activation before Edit/Write/MultiEdit (v2.0)

**How it works:**
1. Checks whether mandatory skills (flagged by skill-activation-prompt) are still pending
2. First edit attempt: BLOCKED with a reminder, pending list cleared
3. Second attempt: allowed (two-try model)
4. Optionally analyzes the code being written for skill suggestions (AI mode)

**Why it's essential:** Suggestions alone get ignored; this provides the enforcement.

**Integration:** copy `skill-verification-guard.sh` + `.ts`, register under `PreToolUse` with matcher `Edit|MultiEdit|Write` (see the shipped settings.json).

**Customization:** ✅ None needed. Env switches: `SKIP_MANDATORY_SKILLS=true` to bypass, `PRETOOLUSE_SOFT_BLOCK=true` for soft mode.

---

### skill-activation-tracker (PostToolUse: Skill)

**Purpose:** Clears skills from the pending list once they're actually activated via the Skill tool (v2.0)

**Why it's essential:** Without it, the guard would keep blocking even after you activated the skill.

**Integration:** copy `skill-activation-tracker.sh` + `.ts`, register under `PostToolUse` with matcher `Skill` (see the shipped settings.json).

**Customization:** ✅ None needed

---

## Optional Hooks (Require Customization)

### tsc-check (Stop)

**Purpose:** TypeScript compilation check when user stops

**⚠️ WARNING:** Configured for multi-service monorepo structure

**Integration:**

**First, determine if this is right for you:**
- ✅ Use if: Multi-service TypeScript monorepo
- ❌ Skip if: Single-service project or different build setup

**If using:**
1. Copy tsc-check.sh
2. **EDIT the service detection (line ~28):**
   ```bash
   # Replace example services with YOUR services:
   case "$repo" in
       api|web|auth|payments|...)  # ← Your actual services
   ```
3. Test manually before adding to settings.json

**Customization:** ⚠️⚠️⚠️ Heavy

---

### trigger-build-resolver (Stop)

**Purpose:** Auto-launches auto-error-resolver agent when compilation fails

**Depends on:** tsc-check hook working correctly

**Customization:** ✅ None (but tsc-check must work first)

---

### stop-build-check-enhanced (Stop)

**Purpose:** Alternative Stop-hook build check with error summaries fed back to Claude

**Customization:** ⚠️ Moderate - expects a TypeScript build setup; review before enabling

---

### error-handling-reminder (Stop)

**Purpose:** Reminds Claude to add error handling/Sentry coverage for files edited this session

**Customization:** ⚠️ Moderate - assumes the tsc-cache tracking from post-tool-use-tracker

---

### session-doc-updater (Stop)

**Purpose:** Part of the session-intelligence system - indexes your active dev-docs task (plan/context files) into a local vector DB so past session knowledge is searchable

**Installed by default** in the shipped settings.json, but it no-ops instantly until you set up session indexing (it requires `data/sessions.db`, created by `.claude/scripts/index-sessions.ts`, plus a `dev/active/` task and a `GEMINI_API_KEY` for embeddings). See [CONFIG.md](CONFIG.md).

**Customization:** ✅ None needed. Disable any time with `SESSION_DOCS_ENABLED=false`.

---

## For Claude Code

**When setting up hooks for a user:**

1. **Read [CLAUDE_INTEGRATION_GUIDE.md](../../CLAUDE_INTEGRATION_GUIDE.md)** first
2. **Always start with the four essential hooks**
3. **Ask before adding Stop hooks** - they can block if misconfigured  
4. **Verify after setup:**
   ```bash
   ls -la .claude/hooks/*.sh | grep rwx
   ```

**Questions?** See [CLAUDE_INTEGRATION_GUIDE.md](../../CLAUDE_INTEGRATION_GUIDE.md)
