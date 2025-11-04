# How to Use Dev-Docs - Complete Guide

## 🎯 The Problem Dev-Docs Solves

**Scenario:** You're working on a complex feature with Claude Code. You've:
- Planned the architecture
- Made important decisions
- Implemented half the code
- Context resets...

**Without dev-docs:** You have to re-explain everything. Claude has to rediscover all your decisions.

**With dev-docs:** Claude reads 3 files and instantly knows:
- What you're building
- What's already done
- What's next
- All key decisions

---

## 📁 The Three-File Structure

Every complex task gets 3 files in `dev/active/[task-name]/`:

```
dev/active/implement-api-authentication/
├── implement-api-authentication-plan.md     # The strategic plan
├── implement-api-authentication-context.md  # Current state & key info
└── implement-api-authentication-tasks.md    # Checklist of all tasks
```

### 1. **[task]-plan.md** - The Strategic Plan

**What it contains:**
- Executive summary (what & why)
- Current state analysis
- Proposed future state
- Implementation phases
- Detailed tasks with acceptance criteria
- Risk assessment
- Timeline estimates

**When you read it:** To understand the overall strategy

**Example snippet:**
```markdown
# Implement API Authentication - Plan

## Executive Summary
Implement JWT-based authentication for the REST API with:
- Login/logout endpoints
- Token refresh mechanism
- Role-based access control
- Secure password storage with bcrypt

## Phase 1: Database Schema (Est: 2 hours)
- Task 1.1: Create users table with columns: id, email, password_hash, role, created_at
  - Acceptance: Migration runs successfully, table created
- Task 1.2: Create refresh_tokens table for token management
  - Acceptance: Foreign key to users table established

## Phase 2: Authentication Service (Est: 4 hours)
...
```

---

### 2. **[task]-context.md** - The Living Document

**What it contains:**
- **SESSION PROGRESS** (most important!)
  - ✅ What's completed
  - 🟡 What's in progress
  - ⚠️ What's blocked
- Key files and their purposes
- Important decisions made
- Technical constraints
- Quick resume instructions

**When you update it:** FREQUENTLY! After every significant step.

**Example:**
```markdown
# Implement API Authentication - Context

## SESSION PROGRESS (2025-11-04 16:45)

### ✅ COMPLETED
- Database schema created (users, refresh_tokens tables)
- Migration file: migrations/001_create_auth_tables.sql
- Password hashing utility implemented
- File: src/utils/password.py (bcrypt with salt rounds=12)

### 🟡 IN PROGRESS
- Implementing AuthService.login() method
- File: src/services/auth_service.py (line 45)
- Next: Add token generation logic

### ⚠️ BLOCKERS
- Need to decide: JWT library (PyJWT vs python-jose)
- Need to clarify: Token expiration time (15min or 1hr?)

## Key Files

**src/services/auth_service.py** (IN PROGRESS)
- Main authentication logic
- Methods: login(), logout(), refresh_token(), verify_token()
- Currently implementing login() method

**src/utils/password.py** (COMPLETE)
- Password hashing with bcrypt
- hash_password(plain: str) -> str
- verify_password(plain: str, hashed: str) -> bool

**src/models/user.py** (COMPLETE)
- User model with SQLAlchemy
- Fields: id, email, password_hash, role, created_at

## Important Decisions

**2025-11-04:** Chose bcrypt over argon2 for wider compatibility
**2025-11-04:** Using UUID for user IDs instead of auto-increment for security

## Quick Resume

To continue:
1. Read this file (you're doing it!)
2. Open src/services/auth_service.py
3. Continue implementing AuthService.login() method
4. See tasks.md for remaining work
```

---

### 3. **[task]-tasks.md** - The Checklist

**What it contains:**
- All tasks organized by phase
- Checkbox format `[ ]` or `[x]`
- Status indicators
- Acceptance criteria

**When you use it:** To track what's done and what's next

**Example:**
```markdown
# Implement API Authentication - Tasks

## Phase 1: Database Schema ✅ COMPLETE

- [x] Create users table
  - Acceptance: Migration runs, table has all fields
- [x] Create refresh_tokens table
  - Acceptance: Foreign key to users works
- [x] Write migration file
  - Acceptance: Migration can be rolled back

## Phase 2: Password Utilities ✅ COMPLETE

- [x] Implement password hashing
  - File: src/utils/password.py
  - Acceptance: Passes all unit tests
- [x] Implement password verification
  - Acceptance: Can verify correct and reject incorrect passwords

## Phase 3: Authentication Service 🟡 IN PROGRESS

- [x] Create AuthService class skeleton
- [ ] Implement login() method (IN PROGRESS)
  - Acceptance: Returns JWT token on valid credentials
  - Acceptance: Raises appropriate error on invalid credentials
- [ ] Implement logout() method
  - Acceptance: Invalidates refresh token
- [ ] Implement refresh_token() method
  - Acceptance: Issues new access token from valid refresh token
- [ ] Implement verify_token() method
  - Acceptance: Validates JWT signature and expiration

## Phase 4: API Endpoints ⏳ NOT STARTED

- [ ] Create POST /auth/login endpoint
- [ ] Create POST /auth/logout endpoint
- [ ] Create POST /auth/refresh endpoint
- [ ] Add authentication middleware

## Phase 5: Testing ⏳ NOT STARTED

- [ ] Unit tests for password utilities
- [ ] Unit tests for AuthService
- [ ] Integration tests for auth endpoints
- [ ] Manual testing with curl/Postman
```

---

## 🚀 How to Use Dev-Docs (Step by Step)

### Starting a New Task

**Step 1: Use the /dev-docs command**

In Claude Code, type:
```
/dev-docs implement-api-authentication
```

**Step 2: Claude creates the structure**

Claude will:
1. Ask clarifying questions about your requirements
2. Examine your codebase
3. Create `dev/active/implement-api-authentication/` directory
4. Generate all 3 files with comprehensive content

**Step 3: Review the plan**

Read the `-plan.md` file and confirm:
- Does the approach make sense?
- Are all requirements covered?
- Are phases in the right order?
- Is anything missing?

**Step 4: Start implementing**

Begin working on Phase 1, Task 1.

---

### During Implementation

**Update context.md FREQUENTLY:**

After completing a task:
```markdown
### ✅ COMPLETED
- Task X completed
- File: path/to/file.py
- Note: Used approach Y because Z
```

When starting a new task:
```markdown
### 🟡 IN PROGRESS
- Implementing feature Y
- File: path/to/file.py (line 50)
- Next: Add validation logic
```

When blocked:
```markdown
### ⚠️ BLOCKERS
- Need to decide on database schema for X
- Waiting for clarification on requirement Y
```

**Update tasks.md as you go:**
```markdown
- [x] Completed task  # Mark as done immediately
- [ ] Next task       # Keep unchecked
```

---

### Updating Before Context Reset

**Use /dev-docs-update command:**

When approaching token limits or ending a session:

```
/dev-docs-update
```

Claude will:
1. Read all your recent changes
2. Update context.md with current SESSION PROGRESS
3. Mark completed tasks in tasks.md
4. Note any new discoveries or decisions

**Manual update:**

Or manually update context.md:
```markdown
## SESSION PROGRESS (2025-11-04 17:30)  # Update timestamp!

### ✅ COMPLETED
- Added all tasks completed since last update

### 🟡 IN PROGRESS
- Current file and line number
- Exactly what you're working on

### ⚠️ BLOCKERS
- Any issues preventing progress
```

---

### After Context Reset

**Claude reads the files:**

Simply tell Claude:
```
"Continue implementing the API authentication feature"
```

Claude will:
1. Read `-plan.md` to understand the strategy
2. Read `-context.md` to see current state
3. Read `-tasks.md` to know what's left
4. Resume exactly where you left off

**No need to re-explain anything!**

---

## 📝 Real-World Example

### Scenario: Building a Database Migration Tool

**Day 1 - Start**
```
You: /dev-docs create-database-migration-tool

Claude:
- Asks about database (PostgreSQL? MySQL?)
- Asks about features (up/down migrations? version tracking?)
- Creates comprehensive plan with 5 phases
- Generates all 3 files
```

**Day 1 - Afternoon**
```
You implement:
- Phase 1: Project structure ✅
- Phase 2: Migration file parser ✅
- Phase 3: Database connection (50% done)

You update context.md:
  ✅ COMPLETED: Phase 1, Phase 2
  🟡 IN PROGRESS: src/db/connector.py, implementing connection pooling
```

**Day 2 - Morning (Context Reset)**
```
You: "Continue working on the database migration tool"

Claude:
- Reads plan.md (understands the overall strategy)
- Reads context.md (sees you're working on connection pooling)
- Reads tasks.md (knows Phases 4-5 are left)

Claude: "I see you're implementing the database connector. Let's finish
        the connection pooling logic in src/db/connector.py. Based on
        the plan, after this we need to implement the migration executor."
```

**Day 2 - Progress**
```
You finish:
- Phase 3: Database connection ✅
- Phase 4: Migration executor ✅

You update context.md before lunch break.
```

**Day 2 - After Lunch (Another Reset)**
```
You: "Continue the migration tool"

Claude: "Great! I see Phases 1-4 are complete. Only Phase 5 (testing)
        remains. Let's write unit tests for the migration executor."
```

**No context lost!**

---

## 🎯 When to Use Dev-Docs

### ✅ Use dev-docs for:

- **Complex features** (takes >2 hours or multiple sessions)
- **Multi-file changes** (touching 5+ files)
- **Architectural changes** (refactoring, migrations)
- **New subsystems** (adding authentication, caching, etc.)
- **Bug fixes requiring investigation** (root cause analysis)

### ❌ Don't use dev-docs for:

- **Simple bug fixes** (1 file, obvious fix)
- **Trivial updates** (changing a string, fixing typo)
- **Quick experiments** (trying something out)
- **Single-function changes** (small isolated changes)

**Rule of thumb:** If it needs planning, use dev-docs.

---

## 💡 Pro Tips

### 1. Update Context.md Religiously

The context file is your lifeline. Update it:
- After completing each phase
- When making important decisions
- Before taking a break
- Before context resets

### 2. Use Timestamps

```markdown
## SESSION PROGRESS (2025-11-04 16:30)
```

This helps you track when changes were made.

### 3. Link to Specific Files

```markdown
**src/services/auth_service.py:45**
- Currently implementing login validation
```

Makes it easy to jump back in.

### 4. Document Why, Not Just What

```markdown
**Decision:** Used bcrypt over argon2
**Reason:** Wider library support, simpler deployment
```

### 5. Keep Tasks Atomic

```markdown
❌ Bad:  - [ ] Implement authentication
✅ Good: - [ ] Create AuthService class
         - [ ] Implement login() method
         - [ ] Add JWT token generation
```

### 6. Use the Update Command

Before you stop working:
```
/dev-docs-update
```

Ensures your context is current.

### 7. Archive Completed Tasks

When done:
```bash
mv dev/active/task-name dev/archive/task-name
```

Keeps active directory clean.

---

## 🔄 Complete Workflow Example

### Setup Phase
```
1. You: "/dev-docs implement-user-registration"
2. Claude: Creates plan, context, tasks files
3. You: Review plan, make adjustments if needed
4. You: Start implementing Phase 1
```

### Work Phase
```
5. Implement a task
6. Update context.md: mark task complete, note decisions
7. Check off task in tasks.md
8. Repeat for next task
```

### Break/Reset Phase
```
9. Before break: "/dev-docs-update"
10. After break/reset: "Continue user registration feature"
11. Claude: Reads files, resumes exactly where you left off
```

### Completion Phase
```
12. Finish all tasks
13. Archive: mv dev/active/task dev/archive/task
14. Delete files if no longer needed
```

---

## 🛠️ Commands Summary

| Command | When to Use | What It Does |
|---------|------------|--------------|
| `/dev-docs <task-name>` | Starting new complex task | Creates plan, context, tasks files |
| `/dev-docs-update` | Before context reset / end of session | Updates context with current progress |
| (manual edit) | During implementation | Update context.md and tasks.md as you work |

---

## 📚 File Templates

### Quick Context.md Template

```markdown
# [Task Name] - Context

## SESSION PROGRESS (YYYY-MM-DD HH:MM)

### ✅ COMPLETED
- List what's done
- Include file paths

### 🟡 IN PROGRESS
- What you're working on right now
- File and line number
- Next immediate step

### ⚠️ BLOCKERS
- What's preventing progress
- Decisions needed

## Key Files

**path/to/file.py**
- Purpose
- Key functions/classes
- Current state

## Important Decisions

**YYYY-MM-DD:** Decision made and rationale

## Quick Resume

1. Read this file
2. Open [specific file]
3. Do [specific next action]
```

---

## ❓ FAQ

### Q: Do I have to use all three files?

**A:** Yes, they serve different purposes:
- `plan.md` = Strategy (rarely changes)
- `context.md` = Current state (changes frequently)
- `tasks.md` = Checklist (updated as tasks complete)

### Q: How often should I update context.md?

**A:** After every significant step. Think of it like saving your game.

### Q: Can I skip dev-docs for small features?

**A:** Yes! Only use it for complex, multi-session work.

### Q: What if my plan changes?

**A:** Update `plan.md` and note the change in `context.md`.

### Q: How does this work with git?

**A:** Commit the `dev/` directory. It helps your team too!

### Q: Can multiple people use the same dev-docs?

**A:** Yes! Just update SESSION PROGRESS with your name:
```markdown
## SESSION PROGRESS (2025-11-04 - Alice)
```

---

## ✨ The Magic Moment

**Before dev-docs:**
```
You (after reset): "I was working on authentication..."
Claude: "Can you remind me what approach you were taking?"
You: "Well, I created a users table, and was implementing..."
(5 minutes of re-explaining)
```

**With dev-docs:**
```
You (after reset): "Continue authentication implementation"
Claude: "I see you completed the users table and password hashing.
        You're currently working on AuthService.login() at line 45
        of src/services/auth_service.py. Let's continue with the
        token generation logic."
(Instant resume!)
```

---

## 🎉 Summary

Dev-docs = **Your project's memory**

- 3 files preserve everything across context resets
- `/dev-docs` creates the structure
- Update context.md frequently
- `/dev-docs-update` before resets
- Claude resumes instantly after reset

**Start using it today for your complex Python/DevSecOps projects!**
