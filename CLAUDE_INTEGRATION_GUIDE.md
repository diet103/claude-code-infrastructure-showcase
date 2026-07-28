# Claude Integration Guide

**FOR CLAUDE CODE:** When a user asks you to integrate components from this showcase repository into their project, follow these instructions carefully.

## Table of Contents

- [Overview](#overview)
- [Setup Wizard (Fastest Path)](#setup-wizard-fastest-path)
- [Choosing Classic vs AI-Enhanced Mode](#choosing-classic-vs-ai-enhanced-mode)
- [AI Provider Setup](#ai-provider-setup)
- [Conservativeness Tuning](#conservativeness-tuning)
- [PreToolUse Guard](#pretooluse-guard)
- [Tech Stack Compatibility Check](#tech-stack-compatibility-check)
- [General Integration Pattern](#general-integration-pattern)
- [Integrating Skills](#integrating-skills)
- [Adapting Skills for Different Tech Stacks](#adapting-skills-for-different-tech-stacks)
- [Verification Checklist](#verification-checklist)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)
- [Example Integration Conversations](#example-integration-conversations)
- [Quick Reference Tables](#quick-reference-tables)

---

## Overview

This repository is a **reference library** of Claude Code infrastructure components. Users will ask you to help integrate specific pieces into their projects. Your role is to:

1. **Ask clarifying questions** about their project structure
2. **Copy the appropriate files**
3. **Customize configurations** for their setup
4. **Verify the integration** works correctly

**Key Principle:** ALWAYS ask before assuming project structure. What works for one project won't work for another.

---

## Setup Wizard (Fastest Path)

For users who want the quickest setup:

```bash
npx tsx setup.ts ~/their-project
```

The wizard:
1. Detects the project's tech stack (React, Express, Prisma, etc.)
2. Asks: Classic (regex-only) or AI-Enhanced mode?
3. If AI: Which provider? Validates API key / Ollama availability
4. Configures conservativeness level
5. Updates `skill-rules.json` with v2.0 settings
6. Installs dependencies
7. Runs the health check (`.claude/scripts/verify-setup.sh`) to verify its own work

**IMPORTANT - when YOU (Claude) run the wizard:** the interactive prompts do not work over piped stdin, and the wizard exits with an error if you try. ALWAYS pass `--yes` with an explicit absolute target path:

```bash
npx tsx setup.ts /absolute/path/to/their-project --yes
# Optional flags: --mode disabled|fallback|ai-only   --provider auto|gemini|openai|anthropic|minimax|ollama
#                 --conservativeness strict|balanced|aggressive   --editor
```

Defaults are safe (`--mode disabled` = regex-only, no API key needed). After it finishes, report the verification results to the user and fix any [FAIL] items.

**After the wizard:** Users can fine-tune by editing `.claude/skills/skill-rules.json`.

---

## Choosing Classic vs AI-Enhanced Mode

| | Classic (disabled) | AI-Enhanced (fallback) | AI-Only |
|---|---|---|---|
| **How it works** | Regex/keyword matching | AI first, regex fallback | Pure AI |
| **Cost** | Free | ~$0.001/prompt | ~$0.001/prompt |
| **Offline** | Yes | Graceful fallback | No |
| **Accuracy** | Good for keywords | Better semantic match | Best accuracy |
| **Setup** | Zero config | API key needed | API key needed |
| **Default** | **Yes** | No | No |

**Recommendation:** Start with Classic mode. If you find skills aren't activating when expected, switch to `fallback` mode with Gemini (free tier).

---

## AI Provider Setup

### Gemini (Recommended - Free Tier)

```bash
# 1. Get free API key: https://aistudio.google.com/apikey
# 2. Add to ~/.bashrc:
export GEMINI_API_KEY=your-key-here
# 3. Update skill-rules.json:
#    "skill_activation_mode": "fallback"
```

### OpenAI

```bash
export OPENAI_API_KEY=your-key-here
# Optional for Azure:
export OPENAI_BASE_URL=https://your-endpoint.openai.azure.com
```

### Anthropic

```bash
export ANTHROPIC_API_KEY=your-key-here
```

### Ollama (Free, Local)

```bash
# 1. Install: https://ollama.ai
# 2. Pull model:
ollama pull llama3.2
# 3. Start server:
ollama serve
# No API key needed!
```

### Provider Auto-Detection

If no `SKILL_AI_PROVIDER` is set, detection tries in order:
1. `GEMINI_API_KEY` present -> Gemini
2. `OPENAI_API_KEY` present -> OpenAI
3. `ANTHROPIC_API_KEY` present -> Anthropic
4. Ollama ping (500ms timeout) -> Ollama
5. No provider -> regex-only fallback

Override with: `export SKILL_AI_PROVIDER=gemini`

---

## Conservativeness Tuning

Controls how aggressively skills are suggested in AI mode:

| Level | Description | Best For |
|-------|-------------|----------|
| **strict** | Only suggest when user explicitly states intent. Minimizes false positives. | Large skill sets, experienced users |
| **balanced** | Standard behavior. Mandatory = direct work, Recommended = context mentions. | Most projects (default) |
| **aggressive** | Suggest liberally. Catches tangential mentions. | New users, small skill sets |

Set via environment: `export SKILL_CONSERVATIVENESS=strict`
Or in `skill-rules.json`: `"settings": { "conservativeness": "strict" }`

---

## PreToolUse Guard

The `skill-verification-guard` hook (new in v2.0) runs before Edit/Write/MultiEdit:

1. **Mandatory enforcement:** If mandatory skills are pending (from UserPromptSubmit), blocks the edit until skills are activated. Uses "two-try" model:
   - First edit: BLOCKED, mandatory_pending cleared
   - Second edit: ALLOWED

2. **AI-powered edit analysis:** Analyzes code being written to suggest relevant skills (if AI provider available)

3. **Guardrail checks:** Matches file paths and content patterns from skill-rules.json

**Configuration:**
- `PRETOOLUSE_SOFT_BLOCK=true` - Block on AI suggestions (default: suggest only)
- `SKIP_MANDATORY_SKILLS=true` - Bypass mandatory enforcement
- `SKILL_GUARD_DEBUG=true` - Detailed debug logging

---

## Tech Stack Compatibility Check

**CRITICAL:** Before integrating a skill, verify the user's tech stack matches the skill requirements.

### Frontend Skills

**frontend-dev-guidelines requires:**
- React (18+)
- MUI v7
- TanStack Query
- TanStack Router
- TypeScript

**Before integrating, ask:**
"Do you use React with MUI v7?"

**If NO:**
```
The frontend-dev-guidelines skill is designed specifically for React + MUI v7. I can:
1. Help you create a similar skill adapted for [their stack] using this as a template
2. Extract the framework-agnostic patterns (file organization, performance, etc.)
3. Skip this skill if not relevant

Which would you prefer?
```

### Backend Skills

**backend-dev-guidelines requires:**
- Node.js/Express
- TypeScript
- Prisma ORM
- Sentry

**Before integrating, ask:**
"Do you use Node.js with Express and Prisma?"

**If NO:**
```
The backend-dev-guidelines skill is designed for Express/Prisma. I can:
1. Help you create similar guidelines adapted for [their stack] using this as a template
2. Extract the architecture patterns (layered architecture works for any framework)
3. Skip this skill

Which would you prefer?
```

### Skills That Are Tech-Agnostic

These work for ANY tech stack:
- ✅ **skill-developer** - Meta-skill, no tech requirements
- ✅ **error-tracking** - Sentry works with most stacks

---

## General Integration Pattern

When user says: **"Add [component] to my project"**

1. Identify component type (skill/hook/agent/command)
2. **CHECK TECH STACK COMPATIBILITY** (for frontend/backend skills)
3. Ask about their project structure
4. Copy files OR adapt for their stack
5. Customize for their setup
6. Verify integration
7. Provide next steps

---

## Integrating Skills

### Step-by-Step Process

**When user requests a skill** (e.g., "add backend-dev-guidelines"):

#### 1. Understand Their Project

**ASK THESE QUESTIONS:**
- "What's your project structure? Single app, monorepo, or multi-service?"
- "Where is your [backend/frontend] code located?"
- "What frameworks/technologies do you use?"

#### 2. Copy the Skill

```bash
cp -r /path/to/showcase/.claude/skills/[skill-name] \\
      $CLAUDE_PROJECT_DIR/.claude/skills/
```

#### 3. Handle skill-rules.json

**Check if it exists:**
```bash
ls $CLAUDE_PROJECT_DIR/.claude/skills/skill-rules.json
```

**If NO (doesn't exist):**
- Copy the template from showcase
- Remove skills user doesn't want
- Customize for their project

**If YES (exists):**
- Read their current skill-rules.json
- Add the new skill entry
- Merge carefully to avoid breaking existing skills

#### 4. Customize Path Patterns

**CRITICAL:** Update `pathPatterns` in skill-rules.json to match THEIR structure:

**Example - User has monorepo:**
```json
{
  "backend-dev-guidelines": {
    "fileTriggers": {
      "pathPatterns": [
        "packages/api/src/**/*.ts",
        "packages/server/src/**/*.ts",
        "apps/backend/**/*.ts"
      ]
    }
  }
}
```

**Example - User has single backend:**
```json
{
  "backend-dev-guidelines": {
    "fileTriggers": {
      "pathPatterns": [
        "src/**/*.ts",
        "backend/**/*.ts"
      ]
    }
  }
}
```

**Safe Generic Patterns** (when unsure):
```json
{
  "pathPatterns": [
    "**/*.ts",          // All TypeScript files
    "src/**/*.ts",      // Common src directory
    "backend/**/*.ts"   // Common backend directory
  ]
}
```

#### 5. Verify Integration

```bash
# Check skill was copied
ls -la $CLAUDE_PROJECT_DIR/.claude/skills/[skill-name]

# Validate skill-rules.json syntax
cat $CLAUDE_PROJECT_DIR/.claude/skills/skill-rules.json | jq .
```

**Tell user:** "Try editing a file in [their-backend-path] and the skill should activate."

---

### Skill-Specific Notes

#### backend-dev-guidelines
- **Tech Requirements:** Node.js/Express, Prisma, TypeScript, Sentry
- **Ask:** "Do you use Express with Prisma?" "Where's your backend code?"
- **If different stack:** Offer to adapt using this as template
- **Customize:** pathPatterns
- **Example paths:** `api/`, `server/`, `backend/`, `services/*/src/`
- **Adaptation tip:** Architecture patterns (Routes→Controllers→Services) transfer to most frameworks

#### frontend-dev-guidelines
- **Tech Requirements:** React 18+, MUI v7, TanStack Query/Router, TypeScript
- **Ask:** "Do you use React with MUI v7?" "Where's your frontend code?"
- **If different stack:** Offer to create adapted version (Vue, Angular, etc.)
- **Customize:** pathPatterns + all framework-specific examples
- **Example paths:** `frontend/`, `client/`, `web/`, `apps/web/src/`
- **Adaptation tip:** File organization and performance patterns transfer, component code doesn't

#### error-tracking
- **Tech Requirements:** Sentry (works with most backends)
- **Ask:** "Do you use Sentry?" "Where's your backend code?"
- **If NO Sentry:** "Want to use this as template for [their error tracking]?"
- **Customize:** pathPatterns
- **Adaptation tip:** Error tracking philosophy transfers to other tools (Rollbar, Bugsnag, etc.)

#### skill-developer
- **Tech Requirements:** None!
- **Copy as-is** - meta-skill, fully generic, teaches skill creation for ANY tech stack

---

## Adapting Skills for Different Tech Stacks

When user's tech stack differs from skill requirements, you have options:

### Option 1: Adapt Existing Skill (Recommended)

**When to use:** User wants similar guidelines but for different tech

**Process:**
1. **Copy the skill as a starting point:**
   ```bash
   cp -r showcase/.claude/skills/frontend-dev-guidelines \\
         $CLAUDE_PROJECT_DIR/.claude/skills/vue-dev-guidelines
   ```

2. **Identify what needs changing:**
   - Framework-specific code examples (React → Vue)
   - Library APIs (MUI → Vuetify/PrimeVue)
   - Import statements
   - Component patterns

3. **Keep what transfers:**
   - File organization principles
   - Performance optimization strategies
   - TypeScript standards
   - General best practices

4. **Replace examples systematically:**
   - Ask user for equivalent patterns in their stack
   - Update code examples to their framework
   - Keep the overall structure and sections

5. **Update skill name and triggers:**
   - Rename skill appropriately
   - Update skill-rules.json triggers for their stack
   - Test activation

**Example - Adapting frontend-dev-guidelines for Vue:**
```
I'll create vue-dev-guidelines based on the React skill structure:
- Replace React.FC → Vue defineComponent
- Replace useSuspenseQuery → Vue composables
- Replace MUI components → [their component library]
- Keep: File organization, performance patterns, TypeScript guidelines

This will take a few minutes. Sound good?
```

### Option 2: Extract Framework-Agnostic Patterns

**When to use:** Stacks are very different, but core principles apply

**Process:**
1. Read through the existing skill
2. Identify framework-agnostic patterns:
   - Layered architecture (backend)
   - File organization strategies
   - Performance optimization principles
   - Testing strategies
   - Error handling philosophy

3. Create new skill with just those patterns
4. User can add framework-specific examples later

**Example:**
```
The backend-dev-guidelines uses Express, but the layered architecture
(Routes → Controllers → Services → Repositories) works for Django too.

I can create a skill with:
- Layered architecture pattern
- Separation of concerns principles
- Error handling best practices
- Testing strategies

Then you can add Django-specific examples as you establish patterns.
```

### Option 3: Use as Reference Only

**When to use:** Too different to adapt, but user wants inspiration

**Process:**
1. User browses the existing skill
2. You help create a new skill from scratch
3. Use existing skill's structure as a template
4. Follow modular pattern (main + resource files)

### What Usually Transfers Across Tech Stacks

**Architecture & Organization:**
- ✅ Layered architecture (Routes/Controllers/Services pattern)
- ✅ Separation of concerns
- ✅ File organization strategies (features/ pattern)
- ✅ Progressive disclosure (main + resource files)
- ✅ Repository pattern for data access

**Development Practices:**
- ✅ Error handling philosophy
- ✅ Input validation importance
- ✅ Testing strategies
- ✅ Performance optimization principles
- ✅ TypeScript best practices

**Framework-Specific Code:**
- ❌ React hooks → Don't transfer to Vue/Angular
- ❌ MUI components → Different component libraries
- ❌ Prisma queries → Different ORM syntax
- ❌ Express middleware → Different framework patterns
- ❌ Routing implementations → Framework-specific

### When to Recommend Adaptation vs Skipping

**Recommend adaptation if:**
- User wants similar guidelines for their stack
- Core patterns apply (layered architecture, etc.)
- User has time to help with framework-specific examples

**Recommend skipping if:**
- Stacks are completely different
- User doesn't need those patterns
- Would take too long to adapt
- User prefers creating from scratch

---

## Integrating Hooks

### Essential Hooks (Always Safe to Copy)

#### skill-activation-prompt (UserPromptSubmit)

**Purpose:** Auto-suggests skills based on user prompts

**Integration (NO customization needed):**

```bash
# Copy both files
cp showcase/.claude/hooks/skill-activation-prompt.sh \\
   $CLAUDE_PROJECT_DIR/.claude/hooks/
cp showcase/.claude/hooks/skill-activation-prompt.ts \\
   $CLAUDE_PROJECT_DIR/.claude/hooks/

# Make executable
chmod +x $CLAUDE_PROJECT_DIR/.claude/hooks/skill-activation-prompt.sh

# Install dependencies if needed
if [ -f "showcase/.claude/hooks/package.json" ]; then
  cp showcase/.claude/hooks/package.json \\
     $CLAUDE_PROJECT_DIR/.claude/hooks/
  cd $CLAUDE_PROJECT_DIR/.claude/hooks && npm install
fi
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

**This hook is FULLY GENERIC** - works anywhere, no customization needed!

#### post-tool-use-tracker (PostToolUse)

**Purpose:** Tracks file changes for context management

**Integration (NO customization needed):**

```bash
# Copy file
cp showcase/.claude/hooks/post-tool-use-tracker.sh \\
   $CLAUDE_PROJECT_DIR/.claude/hooks/

# Make executable
chmod +x $CLAUDE_PROJECT_DIR/.claude/hooks/post-tool-use-tracker.sh
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

**This hook is FULLY GENERIC** - auto-detects project structure!

---

### Optional Hooks (Require Heavy Customization)

#### tsc-check.sh and trigger-build-resolver.sh (Stop hooks)

⚠️ **WARNING:** These hooks are configured for a specific multi-service monorepo structure.

**Before integrating, ask:**
1. "Do you have a monorepo with multiple TypeScript services?"
2. "What are your service directory names?"
3. "Where are your tsconfig.json files located?"

**For SIMPLE projects (single service):**
- **RECOMMEND SKIPPING** these hooks
- They're overkill for single-service projects
- User can run `tsc --noEmit` manually instead

**For COMPLEX projects (multi-service monorepo):**

1. Copy the files
2. **MUST EDIT** tsc-check.sh - find this section:
```bash
case "$repo" in
    email|exports|form|frontend|projects|uploads|users|utilities|events|database)
        echo "$repo"
        return 0
        ;;
esac
```

3. Replace with USER'S actual service names:
```bash
case "$repo" in
    api|web|auth|payments|notifications)  # ← User's services
        echo "$repo"
        return 0
        ;;
esac
```

4. Test manually before adding to settings.json:
```bash
./.claude/hooks/tsc-check.sh
```

**IMPORTANT:** If this hook fails, it will block Stop events. Only add if you're sure it works for their setup.

---

## Integrating Agents

**Agents are STANDALONE** - easiest to integrate!

### Standard Agent Integration

```bash
# Copy the agent file
cp showcase/.claude/agents/[agent-name].md \\
   $CLAUDE_PROJECT_DIR/.claude/agents/
```

**That's it!** Agents work immediately, no configuration needed.

### Check for Hardcoded Paths

Some agents may reference paths. **Before copying, read the agent file and check for:**

- `~/git/old-project/` → Should be `$CLAUDE_PROJECT_DIR` or `.`
- `/root/git/project/` → Should be `$CLAUDE_PROJECT_DIR` or `.`
- Hardcoded screenshot paths → Ask user where they want screenshots

**If found, update them:**
```bash
sed -i 's|~/git/old-project/|.|g' $CLAUDE_PROJECT_DIR/.claude/agents/[agent].md
sed -i 's|/root/git/.*PROJECT.*DIR|$CLAUDE_PROJECT_DIR|g' \\
    $CLAUDE_PROJECT_DIR/.claude/agents/[agent].md
```

### Agent-Specific Notes

**frontend-error-fixer:**
- May reference screenshot paths
- Ask: "Where should screenshots be saved?"

**All other agents:**
- Copy as-is, they're fully generic

---

## Integrating Slash Commands

```bash
# Copy command file
cp showcase/.claude/commands/[command].md \\
   $CLAUDE_PROJECT_DIR/.claude/commands/
```

### Customize Paths

Commands may reference dev docs paths. **Check and update:**

**dev-docs and dev-docs-update:**
- Look for `dev/active/` path references
- Ask: "Where do you want dev documentation stored?"
- Update paths in the command files

**route-research-for-testing:**
- May reference service paths
- Ask about their API structure

---

## Common Patterns & Best Practices

### Pattern: Asking About Project Structure

**DON'T assume:**
- ❌ "I'll add this for your blog-api service"
- ❌ "Configuring for your frontend directory"

**DO ask:**
- ✅ "What's your project structure? Monorepo or single app?"
- ✅ "Where is your backend code located?"
- ✅ "Do you use workspaces or have multiple services?"

### Pattern: Customizing skill-rules.json

**User has monorepo with workspaces:**
```json
{
  "pathPatterns": [
    "packages/*/src/**/*.ts",
    "apps/*/src/**/*.tsx"
  ]
}
```

**User has Nx monorepo:**
```json
{
  "pathPatterns": [
    "apps/api/src/**/*.ts",
    "libs/*/src/**/*.ts"
  ]
}
```

**User has simple structure:**
```json
{
  "pathPatterns": [
    "src/**/*.ts",
    "backend/**/*.ts"
  ]
}
```

### Pattern: settings.json Integration

**NEVER copy the showcase settings.json directly!**

Instead, **extract and merge** the sections they need:

1. Read their existing settings.json
2. Add the hook configurations they want
3. Preserve their existing config

**Example merge:**
```json
{
  // ... their existing config ...
  "hooks": {
    // ... their existing hooks ...
    "UserPromptSubmit": [  // ← Add this section
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

---

## Verification Checklist

**Fastest path - run the health check script** (8 checks, exact fix command per failure, including an end-to-end test of the activation hook):

```bash
bash $CLAUDE_PROJECT_DIR/.claude/scripts/verify-setup.sh
```

Exit 0 = ready (warnings are fine - they cover optional features). Fix any [FAIL] and re-run.

**Manual fallback** if the script isn't present (older install), verify these items:

```bash
# 1. Hooks are executable
ls -la $CLAUDE_PROJECT_DIR/.claude/hooks/*.sh
# Should show: -rwxr-xr-x

# 2. skill-rules.json is valid JSON
cat $CLAUDE_PROJECT_DIR/.claude/skills/skill-rules.json | jq .
# Should parse without errors

# 3. Hook dependencies installed (if TypeScript hooks)
ls $CLAUDE_PROJECT_DIR/.claude/hooks/node_modules/
# Should show packages if package.json exists

# 4. Settings.json is valid JSON
cat $CLAUDE_PROJECT_DIR/.claude/settings.json | jq .
# Should parse without errors
```

**Then ask user to test:**
- "Try editing a file in [relevant-path] - the skill should activate"
- "Try asking me a question about [topic] - I should suggest the skill"

---

## Common Mistakes to Avoid

### ❌ DON'T: Register the heavy Stop hooks without customizing them
**Why:** The shipped `settings.json` works as-is - it registers only the safe hooks (skill activation, guard, trackers, session-doc-updater). The build-check Stop hooks (tsc-check, trigger-build-resolver, stop-build-check-enhanced) are NOT registered by default because they expect specific service directories.
**DO:** Copy `settings.json` as shipped. Only add the build-check Stop hooks after customizing their service lists for the user's project.

### ❌ DON'T: Keep example service names
**Why:** User doesn't have blog-api, auth-service, etc.
**DO:** Ask about their actual structure and update

### ❌ DON'T: Skip making hooks executable
**Why:** Hooks won't run without execute permission
**DO:** Always `chmod +x` after copying

### ❌ DON'T: Assume monorepo structure
**Why:** Most projects are single-service
**DO:** Ask first, then customize

### ❌ DON'T: Add all skills at once
**Why:** Overwhelming and may not all be relevant
**DO:** Ask which skills are relevant to their work

### ❌ DON'T: Copy Stop hooks without testing
**Why:** They can block the Stop event if they fail
**DO:** Test manually first, only add if working

---

## Example Integration Conversations

### Example 1: Adding Backend Skill

**User:** "Add the backend-dev-guidelines skill to my project"

**Claude should respond:**
```
I'll add the backend-dev-guidelines skill. First, I need to understand
your project structure:

1. Is this a monorepo with multiple services, or a single backend application?
2. Where is your backend code located? (e.g., src/, backend/, server/)
3. Do you use Express.js?
```

**User:** "Single app, code is in src/api/, yes we use Express"

**Claude should:**
1. Copy the skill directory
2. Update skill-rules.json with pathPattern: `"src/api/**/*.ts"`
3. Verify it's copied correctly
4. Respond:
```
✅ Added backend-dev-guidelines skill!

Configuration:
- Skill triggers when editing files in src/api/
- Activated by keywords like "controller", "service", "route", "API"

Try it: Edit a file in src/api/ and you should see the skill suggestion.
```

### Example 2: Setting Up Hooks

**User:** "Set up the skill activation hooks"

**Claude should respond:**
```
I'll set up the skill auto-activation system. This requires two hooks:
1. skill-activation-prompt - Suggests skills based on your prompts
2. post-tool-use-tracker - Tracks file changes

Do you have a .claude/settings.json file already, or should I create one?
```

**User:** "I have settings.json already"

**Claude should:**
1. Read their settings.json
2. Copy both hook files
3. Run npm install in hooks directory
4. Add hook configurations to their settings.json (preserving existing config)
5. Make hooks executable
6. Respond:
```
✅ Skill activation hooks installed!

What I did:
- Copied skill-activation-prompt hook
- Copied post-tool-use-tracker hook
- Installed dependencies
- Added to your settings.json

Test it: Ask me "help with backend development" and I should suggest
the backend-dev-guidelines skill.
```

### Example 3: Adding Agent

**User:** "Add the code-architecture-reviewer agent"

**Claude should:**
```
The code-architecture-reviewer agent reviews code for architectural issues
and best practices. This agent works standalone, no configuration needed.

I'll copy it to your .claude/agents/ directory now.
```

**Then:**
1. Copy the agent file
2. Respond:
```
✅ Added code-architecture-reviewer agent!

Use it by running the Task tool with:
- subagent_type: "code-architecture-reviewer"
- prompt: Description of code to review

The agent will review your code and provide architectural feedback.
```

### Example 3: Tech Stack Mismatch

**User:** "Add the frontend-dev-guidelines skill to my Vue project"

**Claude should:**
```
I see you're using Vue. The frontend-dev-guidelines skill is specifically
designed for React + MUI v7. I have a few options:

Option 1 (Recommended): I can create a vue-dev-guidelines skill using the
React skill as a template. I'll adapt:
- Component patterns for Vue (Composition API, defineComponent)
- Replace MUI examples with your component library
- Adapt data fetching for Vue patterns
- Keep: File organization, performance principles, TypeScript standards

Option 2: Extract only the framework-agnostic patterns (file organization,
performance, testing) without React-specific code.

Option 3: Skip it and help you create Vue guidelines from scratch.

Which would you prefer?
```

**User:** "Option 1 sounds good, I use Vuetify"

**Claude should:**
1. Copy frontend-dev-guidelines as vue-dev-guidelines
2. Go through each resource file
3. Replace React patterns with Vue Composition API
4. Replace MUI components with Vuetify
5. Update skill-rules.json with Vue-specific triggers (.vue files)
6. Respond:
```
✅ Created vue-dev-guidelines skill adapted for Vue 3 + Vuetify!

What I changed:
- React.FC components → Vue defineComponent
- MUI v7 examples → Vuetify components
- TanStack Query → Your data fetching approach
- File patterns → .vue files

What I kept:
- File organization (features/ pattern)
- Performance optimization strategies
- TypeScript standards
- Loading/error state principles

Try editing a .vue file - the skill should activate.
```

---

## Quick Reference Tables

### What Needs Customization?

| Component | Tech Requirements | Customization | What to Ask |
|-----------|------------------|--------------|-------------|
| **skill-developer** | None | ✅ None | Copy as-is |
| **backend-dev-guidelines** | Express/Prisma/Node | ⚠️ Paths + tech check | "Use Express/Prisma?" "Where's backend?" |
| **frontend-dev-guidelines** | React/MUI v7 | ⚠️⚠️ Paths + framework | "Use React/MUI v7?" "Where's frontend?" |
| **error-tracking** | Sentry | ⚠️ Paths | "Use Sentry?" "Where's backend?" |
| **skill-activation-prompt** | ✅ None | Copy as-is |
| **post-tool-use-tracker** | ✅ None | Copy as-is |
| **tsc-check** | ⚠️⚠️⚠️ Heavy | "Monorepo or single service?" |
| **All agents** | ✅ Minimal | Check paths |
| **All commands** | ⚠️ Paths | "Where for dev docs?" |

### When to Recommend Skipping

| Component | Skip If... |
|-----------|-----------|
| **tsc-check hooks** | Single-service project or different build setup |
| **frontend-dev-guidelines** | Not using React + MUI |

---

## Final Tips for Claude

**When user says "add everything":**
- Start with essentials: skill-activation hooks + 1-2 relevant skills
- Don't overwhelm them with all 4 skills + 8 agents
- Ask what they actually need

**When something doesn't work:**
- Check verification checklist
- Verify paths match their structure
- Test hooks manually
- Check for JSON syntax errors

**When user is unsure:**
- Recommend starting with just skill-activation hooks
- Add backend OR frontend skill (whichever they use)
- Add more later as needed

**Always explain what you're doing:**
- Show the commands you're running
- Explain why you're asking questions
- Provide clear next steps after integration

---

**Remember:** This is a reference library, not a working application. Your job is to help users cherry-pick and adapt components for THEIR specific project structure.
