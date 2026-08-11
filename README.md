# Claude Code Infrastructure Showcase

**A curated reference library of production-tested Claude Code infrastructure.**

Born from 6 months of real-world use managing a complex TypeScript microservices project, this showcase provides the patterns and systems that solved the "skills don't activate automatically" problem and scaled Claude Code for enterprise development.

> **This is NOT a working application** - it's a reference library. Copy what you need into your own projects.

**New to Claude Code infrastructure? Three terms cover 90% of this README:**
- **Skill** - a markdown guide (patterns, conventions, examples) that Claude loads when relevant
- **Hook** - a script Claude Code runs automatically at key moments (every prompt, before/after edits)
- **skill-rules.json** - the config that tells hooks which prompts/files should trigger which skills

Full explanations in [Key Concepts](#key-concepts).

---

## What's Inside

**Production-tested infrastructure for:**
- ✅ **Auto-activating skills** via hooks
- ✅ **Modular skill pattern** (500-line rule with progressive disclosure)
- ✅ **Specialized agents** for complex tasks
- ✅ **Dev docs system** that survives context resets
- ✅ **Comprehensive examples** using generic blog domain

**Time investment to build:** 6 months of iteration
**Time to integrate into your project:** 15-30 minutes

---

## Quick Start

### Requirements

- **Node.js 18+** (20+ recommended) and npm
- **macOS, Linux, or WSL2** - the hooks are bash scripts and won't run in plain cmd/PowerShell (Windows users: use WSL2)
- **jq** - only needed if you enable the optional Stop hooks

> Note: the first `npx tsx` run may ask to install tsx - say yes.

### Option A: Setup Wizard (Recommended)

The wizard copies everything, installs dependencies, and configures your mode:

```bash
# 1. Clone this repo
git clone https://github.com/diet103/claude-code-infrastructure-showcase.git

# 2. Run the setup wizard, pointing to YOUR project
cd claude-code-infrastructure-showcase
npx tsx setup.ts ~/my-project
```

The wizard will:
- Copy `.claude/` (hooks, skills, agents, commands) into your project
- Detect your tech stack (React, Express, Prisma, etc.)
- Ask: Classic (regex-only) or AI-Enhanced mode?
- If AI: which provider? Validates API key availability
- Install hook dependencies and make scripts executable
- **Verify its own work** - 8 health checks before it declares success

> Scripting it, or letting Claude Code run it? Add `--yes`:
> `npx tsx setup.ts ~/my-project --yes` (see `--help` for all flags)

### Option B: Manual (3 Commands)

```bash
# 1. Clone this repo
git clone https://github.com/diet103/claude-code-infrastructure-showcase.git

# 2. Copy .claude/ into YOUR project
cp -r claude-code-infrastructure-showcase/.claude ~/my-project/.claude

# 3. Install hook dependencies
cd ~/my-project/.claude/hooks && npm install && chmod +x *.sh
```

### Option C: Let Claude Code Do It (Easiest)

Don't want to touch the terminal? Open Claude Code in your project and paste this:

```text
Clone https://github.com/diet103/claude-code-infrastructure-showcase to a temp
directory and read its CLAUDE_INTEGRATION_GUIDE.md. Then install the
infrastructure into this project by running the setup wizard non-interactively
(npx tsx setup.ts <this project's absolute path> --yes). When it finishes, show
me the verification results and fix anything that failed.
```

Claude clones the repo, runs the wizard (which verifies its own work), and reports back.

### Verify It Works (30 Seconds)

Any time, from your project root:

```bash
bash .claude/scripts/verify-setup.sh
```

Eight checks - Node version, hook registration, executable bits, dependencies, config validity, even firing a test prompt through the real activation hook - each with an exact fix command if it fails. Or ask Claude to run `/verify-setup` and it fixes failures itself.

### Enable AI-Powered Classification (Optional)

**No API key needed by default.** The standard mode uses regex/keyword matching - free, offline, zero API calls. AI classification is an optional upgrade that matches your *intent* instead of your keywords.

To enable it (Gemini's free tier easily covers this use case):

```bash
# 1. Get a free Gemini API key: https://aistudio.google.com/apikey

# 2. Put it in the hooks .env file:
cp .claude/hooks/.env.example .claude/hooks/.env
# then open .claude/hooks/.env and uncomment: GEMINI_API_KEY=your-key-here
# (add .env to your project's .gitignore so you never commit it)

# 3. Enable AI mode - edit .claude/skills/skill-rules.json and change:
#   "skill_activation_mode": "disabled"  →  "skill_activation_mode": "fallback"
```

Prefer environment variables? `export GEMINI_API_KEY=your-key` in `~/.bashrc` works too - the hooks read both. (`fallback` mode always degrades gracefully: no key, dead network, slow provider - you get regex matching, never a broken prompt.)

### Upgrading an Existing Install

Re-running the wizard on a project that already has `.claude/` deliberately copies **no files** - it only re-chmods hooks, updates skill-rules.json settings, and reinstalls dependencies. It will never clobber your customized `skill-rules.json` or skills.

To pick up new files from a newer version of this repo:
- Copy specific pieces from a fresh clone (e.g. `cp -r showcase/.claude/scripts ~/my-project/.claude/`), or
- If your `.claude/` is committed to git: delete it, re-run the wizard, then `git diff` to port your customizations back.

### Editor Setup (Optional)

The repo includes a NeoVim configuration optimized for Claude Code's prompt editing mode (`Ctrl+G`):

- **Relative line numbers** for easy jumping (`5j` = down 5 lines)
- **Word-boundary wrapping** for long prompts
- **System clipboard integration** (yank = Cmd+C)
- **Space+w** to save and submit, **Space+q** to cancel

The setup wizard can install this automatically, or manually:

```bash
mkdir -p ~/.config/nvim
cp editor-config/init.lua ~/.config/nvim/init.lua
cp editor-config/vimrc ~/.vimrc
echo 'export EDITOR=nvim' >> ~/.bashrc && source ~/.bashrc
```

See [`editor-config/README.md`](editor-config/README.md) for full keybinding reference.

### What You'll See

After setup, when you type "create a React component" in Claude Code:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ MANDATORY SKILL ACTIVATION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST activate these skills BEFORE any action:
  → frontend-dev-guidelines

⚠️ EDITS WILL BE BLOCKED until mandatory skills are activated.
Your FIRST action must be: Skill tool calls.
[via regex]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Skills auto-activate based on your prompts. No more forgetting to load them.

---

## Pick Your Path

### 🤖 Using Claude Code to Integrate?

**Claude:** Read [`CLAUDE_INTEGRATION_GUIDE.md`](CLAUDE_INTEGRATION_GUIDE.md) for step-by-step integration instructions tailored for AI-assisted setup.

### 📚 Browse the Skills Catalog

**Available skills** ([full catalog](.claude/skills/)):
- **backend-dev-guidelines** - Node.js/Express/TypeScript patterns
- **frontend-dev-guidelines** - React/TypeScript/MUI v7 patterns
- **skill-developer** - Meta-skill for creating skills
- **error-tracking** - Sentry integration patterns

### 🤖 Specialized Agents

8 production-tested agents for complex tasks ([full list](.claude/agents/)):
- Code architecture review, refactoring, documentation, error debugging, and more

---

## What Makes This Different?

### The Auto-Activation Breakthrough

**Problem:** Claude Code skills just sit there. You have to remember to use them.

**Solution:** UserPromptSubmit hook that:
- Analyzes your prompts
- Checks file context
- Automatically suggests relevant skills
- Works via `skill-rules.json` configuration

**Result:** Skills activate when you need them, not when you remember them.

### AI-Powered Classification (NEW in v2.0)

Choose your activation mode:

| Mode | How It Works | Cost | Offline |
|------|-------------|------|---------|
| **`disabled`** (default) | Regex/keyword matching only | Free | Yes |
| **`fallback`** | AI first, regex on failure | Low | Graceful |
| **`ai-only`** | Pure AI classification | Low | No |

**Supported AI providers:**

| Provider | Model | API Key | Free Tier |
|----------|-------|---------|-----------|
| Gemini | gemini-3-flash-preview | `GEMINI_API_KEY` | Yes (generous) |
| OpenAI | gpt-4o-mini | `OPENAI_API_KEY` | No |
| Anthropic | claude-haiku-4-5 | `ANTHROPIC_API_KEY` | No |
| MiniMax | MiniMax-M3 (default), MiniMax-M2.7 | `MINIMAX_API_KEY` | No |
| Ollama | llama3.2 (local) | None needed | Yes (local) |

Auto-detection tries providers in order: Gemini > OpenAI > Anthropic > MiniMax > Ollama. Override with `SKILL_AI_PROVIDER=gemini`.

**Conservativeness levels** control suggestion aggressiveness:
- **`strict`** - Minimize false positives. Only suggest when clear intent.
- **`balanced`** (default) - Standard behavior.
- **`aggressive`** - Catch everything. Suggest liberally.

### Production-Tested Patterns

These aren't theoretical examples - they're extracted from:
- ✅ 6 microservices in production
- ✅ 50,000+ lines of TypeScript
- ✅ React frontend with complex data grids
- ✅ Sophisticated workflow engine
- ✅ 6 months of daily Claude Code use

The patterns work because they solved real problems.

### Modular Skills (500-Line Rule)

Large skills hit context limits. The solution:

```
skill-name/
  SKILL.md                  # <500 lines, high-level guide
  resources/
    topic-1.md              # aim for <500 lines each
    topic-2.md
    topic-3.md
```

**Progressive disclosure:** Claude loads main skill first, loads resources only when needed.

---

## Repository Structure

```
.claude/
├── skills/                 # 4 production skills
│   ├── backend-dev-guidelines/  (11 resource files)
│   ├── frontend-dev-guidelines/ (10 resource files)
│   ├── skill-developer/         (6 resource files)
│   ├── error-tracking/
│   └── skill-rules.json    # Skill activation configuration
├── hooks/                  # 9 hooks for automation
│   ├── skill-activation-prompt.*  (ESSENTIAL)
│   ├── skill-verification-guard.* (ESSENTIAL, v2.0)
│   ├── skill-activation-tracker.* (ESSENTIAL, v2.0)
│   ├── post-tool-use-tracker.sh   (ESSENTIAL)
│   ├── session-doc-updater.*      (optional, installed by default)
│   ├── error-handling-reminder.*  (optional)
│   ├── stop-build-check-enhanced.sh (optional)
│   ├── tsc-check.sh        (optional, needs customization)
│   └── trigger-build-resolver.sh  (optional)
├── agents/                 # 8 specialized agents
│   ├── code-architecture-reviewer.md
│   ├── refactor-planner.md
│   ├── frontend-error-fixer.md
│   └── ... 5 more
├── commands/               # 4 slash commands
│   ├── dev-docs.md
│   ├── verify-setup.md
│   └── ...
└── scripts/
    └── verify-setup.sh     # One-command health check

dev/
└── active/                 # Dev docs pattern examples
    └── showcase-ai-upgrade/
```

---

## Component Catalog

### 🎨 Skills (4)

| Skill | Lines | Purpose | Best For |
|-------|-------|---------|----------|
| [**skill-developer**](.claude/skills/skill-developer/) | 426 | Creating and managing skills | Meta-development |
| [**backend-dev-guidelines**](.claude/skills/backend-dev-guidelines/) | 304 | Express/Prisma/Sentry patterns | Backend APIs |
| [**frontend-dev-guidelines**](.claude/skills/frontend-dev-guidelines/) | 398 | React/MUI v7/TypeScript | React frontends |
| [**error-tracking**](.claude/skills/error-tracking/) | ~250 | Sentry integration | Error monitoring |

**All skills follow the modular pattern** - main file + resource files for progressive disclosure.

**👉 [How to integrate skills →](.claude/skills/README.md)**

### 🪝 Hooks (9)

| Hook | Type | Essential? | Customization |
|------|------|-----------|---------------|
| skill-activation-prompt | UserPromptSubmit | ✅ YES | ✅ None needed |
| skill-verification-guard | PreToolUse | ✅ YES (v2.0) | ✅ None needed |
| skill-activation-tracker | PostToolUse (Skill) | ✅ YES (v2.0) | ✅ None needed |
| post-tool-use-tracker | PostToolUse (Edit) | ✅ YES | ✅ None needed |
| tsc-check | Stop | ⚠️ Optional | ⚠️ Heavy - monorepo only |
| trigger-build-resolver | Stop | ⚠️ Optional | ⚠️ Heavy - monorepo only |
| error-handling-reminder | Stop | ⚠️ Optional | ⚠️ Moderate |
| stop-build-check-enhanced | Stop | ⚠️ Optional | ⚠️ Moderate |
| session-doc-updater | Stop | ⚠️ Optional (installed by default) | ✅ None - no-ops until session indexing is configured ([CONFIG.md](.claude/hooks/CONFIG.md)) |

**Hook types:** UserPromptSubmit fires on every prompt you send; PreToolUse fires before each Edit/Write; PostToolUse fires after; Stop fires when Claude finishes responding.

**New in v2.0:**
- **skill-verification-guard** - PreToolUse hook that analyzes code being written and enforces mandatory skill activation (two-try blocking model)
- **skill-activation-tracker** - Clears skills from mandatory_pending after they're activated via the Skill tool

**Start with the essential hooks** - they enable skill auto-activation and work out of the box.

**👉 [Hook setup guide →](.claude/hooks/README.md)**

### 🤖 Agents (8)

**Standalone - just copy and use!**

| Agent | Purpose |
|-------|---------|
| code-architecture-reviewer | Review code for architectural consistency |
| code-refactor-master | Plan and execute refactoring |
| documentation-architect | Generate comprehensive documentation |
| frontend-error-fixer | Debug frontend errors |
| plan-reviewer | Review development plans |
| refactor-planner | Create refactoring strategies |
| web-research-specialist | Research technical issues online |
| auto-error-resolver | Auto-fix TypeScript errors |

**👉 [How agents work →](.claude/agents/README.md)**

### 💬 Slash Commands (4)

| Command | Purpose |
|---------|---------|
| /dev-docs | Create structured dev documentation |
| /dev-docs-update | Update docs before context reset |
| /verify-setup | Run the infrastructure health check and fix failures |
| /route-research-for-testing | Research route patterns for testing |

---

## Key Concepts

### Hooks + skill-rules.json = Auto-Activation

**The system:**
1. **skill-activation-prompt hook** runs on every user prompt
2. Checks **skill-rules.json** for trigger patterns
3. Suggests relevant skills automatically
4. Skills load only when needed

**This solves the #1 problem** with Claude Code skills: they don't activate on their own.

### Progressive Disclosure (500-Line Rule)

**Problem:** Large skills hit context limits

**Solution:** Modular structure
- Main SKILL.md <500 lines (overview + navigation)
- Resource files aim for <500 lines each (full disclosure: a few deep-dives currently run 500-871 lines - kept whole for coherence, splitting them is on the list)
- Claude loads incrementally as needed

**Example:** backend-dev-guidelines has 11 resource files covering routing, controllers, services, repositories, testing, etc.

### Dev Docs Pattern

**Problem:** Context resets lose project context

**Solution:** Three-file structure
- `[task]-plan.md` - Strategic plan
- `[task]-context.md` - Key decisions and files
- `[task]-tasks.md` - Checklist format

**Works with:** `/dev-docs` slash command to generate these automatically

---

## Works with Codex Too (Cross-Agent Support)

Codex CLI's hooks system uses the same events, stdin schema, and exit-code semantics as Claude Code, and skills follow the cross-agent [Agent Skills standard](https://agentskills.io). This repo ships both wired up — **one canonical codebase, zero forked scripts**:

- **`.agents/skills/`** — a synced mirror of `.claude/skills/` in the standard location Codex (and 30+ other tools) reads natively. Keep it fresh with `.claude/scripts/sync-agent-skills.sh`; `verify-setup` warns on drift.
- **`.codex/hooks.json`** — registers the same four lifecycle hooks for Codex.
- **`.codex/hooks/_codex-adapter.sh`** — a thin shim that closes the two real gaps: it sets `CLAUDE_PROJECT_DIR` (Codex runs hooks at the session cwd) and translates Codex's native `apply_patch` tool into per-file events the verification guard understands. Everything else passes through untouched to `.claude/hooks/`.

Setup:

1. Install Codex natively in your shell environment (`npm i -g @openai/codex`). If you're on WSL, don't use a Windows-side install through the interop layer — hooks would run as Windows processes with UNC paths.
2. Launch `codex` from the repo root. On first run Codex asks you to **trust this project's hooks** — accept (trust is hash-persisted in `~/.codex/config.toml`, and re-prompted if the hook config changes).
3. That's it. Prompt-time skill suggestions, edit blocking for `block`-enforced skills (two-try model included), file tracking, session-state, and the activation telemetry (`state/metrics.jsonl`) all run identically under both agents — same state directory, same metrics, one `skill-rules.json`.

Known parity gap: Codex has no `Skill` tool event, so the PostToolUse tracker that clears `mandatory_pending` early never fires there; the two-try model bounds the cost at one advisory block per skill per session. `.codex/agents/` is an experimental subagent port and not wired into any of this.

---

## ⚠️ Important: What Won't Work As-Is

### settings.json
The included `settings.json` works out of the box for the essential hooks (UserPromptSubmit, PreToolUse, PostToolUse). If you add optional Stop hooks (tsc-check, build-check), those need customization for your project structure. Note that the shipped `settings.json` contains hook registrations only - permissions are yours to manage (e.g. via `/permissions` in Claude Code).

### Blog Domain Examples
Skills use generic blog examples (Post/Comment/User):
- These are **teaching examples**, not requirements
- Patterns work for any domain (e-commerce, SaaS, etc.)
- Adapt the patterns to your business logic

### Hook Directory Structures
Some hooks expect specific structures:
- `tsc-check.sh` expects service directories
- Customize based on YOUR project layout

---

## Integration Workflow

**Recommended approach:**

### Option A: Setup Wizard (Fastest)

```bash
npx tsx setup.ts ~/my-project          # interactive
npx tsx setup.ts ~/my-project --yes    # non-interactive (what Claude Code uses)
```

The wizard handles everything: tech detection, mode selection, provider config, dependency install, and a self-verification pass at the end.

### Option B: Manual Setup

#### Phase 1: Skill Activation (15 min)
1. Copy all essential hooks (skill-activation-prompt, skill-verification-guard, skill-activation-tracker, post-tool-use-tracker)
2. Update settings.json with hook registrations
3. Install hook dependencies: `cd .claude/hooks && npm install`
4. Make shell scripts executable: `chmod +x .claude/hooks/*.sh`

#### Phase 2: Add First Skill (10 min)
1. Pick ONE relevant skill
2. Copy skill directory
3. Create/update skill-rules.json
4. Customize path patterns

#### Phase 3: Enable AI (Optional, 5 min)
1. Edit `.claude/skills/skill-rules.json`
2. Change `"skill_activation_mode"` to `"fallback"`
3. Set your API key: `export GEMINI_API_KEY=your-key` in `~/.bashrc`
4. Restart Claude Code

#### Phase 4: Test & Iterate (5 min)
1. Edit a file - skill should activate
2. Ask a question - skill should be suggested
3. Add more skills as needed

#### Phase 5: Optional Enhancements
- Add agents you find useful
- Add slash commands
- Customize Stop hooks (advanced)
- Tune conservativeness level

## Environment Variables

```bash
# AI Provider (optional - only for AI mode)
SKILL_AI_PROVIDER=gemini         # Force: gemini|openai|anthropic|minimax|ollama
GEMINI_API_KEY=                  # Auto-detect Gemini
OPENAI_API_KEY=                  # Auto-detect OpenAI
ANTHROPIC_API_KEY=               # Auto-detect Anthropic
MINIMAX_API_KEY=                 # Auto-detect MiniMax
MINIMAX_MODEL=MiniMax-M3         # MiniMax-M3 (default) or MiniMax-M2.7
MINIMAX_BASE_URL=https://api.minimax.io/anthropic  # Global; China: https://api.minimaxi.com/anthropic
OLLAMA_MODEL=llama3.2            # Default Ollama model
OLLAMA_BASE_URL=http://localhost:11434

# Behavior
SKILL_CONSERVATIVENESS=balanced  # strict|balanced|aggressive
DEBUG_SKILLS=0                   # 1 for debug output

# PreToolUse Guard
PRETOOLUSE_SOFT_BLOCK=false      # true for soft-blocking
SKIP_MANDATORY_SKILLS=false      # true to bypass enforcement
```

See [`.env.example`](.env.example) for full documentation.

---

## Getting Help

### Troubleshooting / Disabling

**Something not working?** Run the health check first - it tells you exactly what to fix:

```bash
bash .claude/scripts/verify-setup.sh
```

Or ask Claude to run `/verify-setup` and it fixes the failures itself.

**Need everything off fast?** Remove the `"hooks"` block from `.claude/settings.json` - all hooks stop running immediately.

**Per-feature kill switches** (set in your shell or before launching Claude Code):
- `SESSION_DOCS_ENABLED=false` - disable session doc updates
- `SKIP_MANDATORY_SKILLS=true` - bypass mandatory skill enforcement
- `DEBUG_SKILLS=1` - verbose logging for skill activation

**Where logs live:** `.claude/hooks/*.log` and `.claude/hooks/data/`

### For Users
**Issues with integration?**
1. Check [CLAUDE_INTEGRATION_GUIDE.md](CLAUDE_INTEGRATION_GUIDE.md)
2. Ask Claude: "Why isn't [skill] activating?"
3. Open an issue with your project structure

### For Claude Code
When helping users integrate:
1. **Read CLAUDE_INTEGRATION_GUIDE.md FIRST**
2. Ask about their project structure
3. Customize, don't blindly copy
4. Verify after integration

---

## What This Solves

### Before This Infrastructure

❌ Skills don't activate automatically
❌ Have to remember which skill to use
❌ Large skills hit context limits
❌ Context resets lose project knowledge
❌ No consistency across development
❌ Manual agent invocation every time

### After This Infrastructure

✅ Skills suggest themselves based on context
✅ Hooks trigger skills at the right time
✅ Modular skills stay under context limits
✅ Dev docs preserve knowledge across resets
✅ Consistent patterns via guardrails
✅ Agents streamline complex tasks

---

## Community

**Found this useful?**

- ⭐ Star this repo
- 🐛 Report issues or suggest improvements
- 💬 Share your own skills/hooks/agents
- 📝 Contribute examples from your domain

**Background:**
This infrastructure was detailed in a post I made to Reddit ["Claude Code is a Beast – Tips from 6 Months of Hardcore Use"](https://www.reddit.com/r/ClaudeAI/comments/1oivjvm/claude_code_is_a_beast_tips_from_6_months_of/). After hundreds of requests, this showcase was created to help the community implement these patterns.


---

## License

MIT License - Use freely in your projects, commercial or personal.

---

## Quick Links

- 📖 [Claude Integration Guide](CLAUDE_INTEGRATION_GUIDE.md) - For AI-assisted setup
- 🎨 [Skills Documentation](.claude/skills/README.md)
- 🪝 [Hooks Setup](.claude/hooks/README.md)
- 🤖 [Agents Guide](.claude/agents/README.md)
- 📝 [Dev Docs Pattern](dev/README.md)

**Start here:** Copy the two essential hooks, add one skill, and see the auto-activation magic happen.
