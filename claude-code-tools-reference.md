# Claude Code Tools Reference

This document shows the **actual tool calls** Claude Code makes, demonstrating the technical implementation.

---

## Tool Architecture

Claude Code uses a **tool-based architecture** where each capability is a discrete tool with specific parameters.

```
┌─────────────────┐
│   User Prompt   │
│ "Fix this bug"  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Claude AI      │
│  Analyzes       │
│  Plans tools    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tool Execution │
│  Read, Edit,    │
│  Bash, etc.     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Results Back   │
│  to Claude      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Next Action    │
│  or Complete    │
└─────────────────┘
```

---

## Core Tools

### 1. Read Tool

**Purpose:** Read file contents with line numbers

**Parameters:**
```javascript
{
  file_path: string,    // Absolute path (required)
  offset: number,       // Starting line (optional)
  limit: number         // Number of lines (optional)
}
```

**Example Call:**
```json
{
  "tool": "Read",
  "parameters": {
    "file_path": "/home/user/project/src/App.tsx"
  }
}
```

**Returns:**
```
1    import React from 'react';
2    import { Header } from './components/Header';
3
4    function App() {
5      return (
6        <div className="App">
7          <Header />
8        </div>
9      );
10   }
```

**Use Cases:**
- Understanding existing code
- Checking file structure before editing
- Reading configuration files
- Analyzing implementation details

---

### 2. Edit Tool

**Purpose:** Make precise string replacements in files

**Parameters:**
```javascript
{
  file_path: string,     // Absolute path (required)
  old_string: string,    // Exact string to replace (required)
  new_string: string,    // Replacement string (required)
  replace_all: boolean   // Replace all occurrences (optional, default: false)
}
```

**Example Call:**
```json
{
  "tool": "Edit",
  "parameters": {
    "file_path": "/home/user/project/src/App.tsx",
    "old_string": "function App() {\n  return (\n    <div className=\"App\">\n      <Header />\n    </div>\n  );\n}",
    "new_string": "function App() {\n  return (\n    <div className=\"App\">\n      <Header />\n      <main>\n        <h1>Welcome</h1>\n      </main>\n    </div>\n  );\n}"
  }
}
```

**Key Features:**
- Exact string matching (must be unique or use replace_all)
- Preserves formatting and indentation
- Fails safely if string not found
- Can update all occurrences with replace_all

**Use Cases:**
- Modifying existing functions
- Updating component props
- Changing variable names
- Fixing bugs

---

### 3. Write Tool

**Purpose:** Create new files or completely overwrite existing ones

**Parameters:**
```javascript
{
  file_path: string,    // Absolute path (required)
  content: string       // Full file contents (required)
}
```

**Example Call:**
```json
{
  "tool": "Write",
  "parameters": {
    "file_path": "/home/user/project/src/utils/formatters.ts",
    "content": "export function formatCurrency(amount: number): string {\n  return new Intl.NumberFormat('en-US', {\n    style: 'currency',\n    currency: 'USD'\n  }).format(amount);\n}\n"
  }
}
```

**Use Cases:**
- Creating new modules
- Writing configuration files
- Generating boilerplate
- Creating test files

**Note:** Claude prefers Edit over Write for existing files to make surgical changes.

---

### 4. Bash Tool

**Purpose:** Execute shell commands

**Parameters:**
```javascript
{
  command: string,           // Command to run (required)
  description: string,       // What it does (optional but recommended)
  timeout: number,          // Milliseconds (optional, default: 120000)
  run_in_background: boolean // Run async (optional, default: false)
}
```

**Example Calls:**

**Running tests:**
```json
{
  "tool": "Bash",
  "parameters": {
    "command": "npm test",
    "description": "Run test suite"
  }
}
```

**Git operations (sequential):**
```json
{
  "tool": "Bash",
  "parameters": {
    "command": "git add . && git commit -m \"feat: add user profile page\" && git push",
    "description": "Stage, commit, and push changes"
  }
}
```

**Multiple independent commands (parallel):**
```javascript
// Claude makes multiple Bash calls in one message:
Bash({ command: "npm run lint" })
Bash({ command: "npm run type-check" })
Bash({ command: "npm run test" })
```

**Use Cases:**
- Running build tools (npm, webpack, etc.)
- Git operations
- Installing dependencies
- Running tests
- Deployment commands

---

### 5. Grep Tool

**Purpose:** Search code with regex patterns

**Parameters:**
```javascript
{
  pattern: string,              // Regex pattern (required)
  path: string,                 // Directory to search (optional)
  output_mode: string,          // "content" | "files_with_matches" | "count"
  glob: string,                 // File pattern filter (optional)
  type: string,                 // File type: "js", "py", etc. (optional)
  "-i": boolean,                // Case insensitive (optional)
  "-A": number,                 // Lines after match (optional)
  "-B": number,                 // Lines before match (optional)
  "-C": number,                 // Lines context (optional)
  multiline: boolean            // Multi-line matching (optional)
}
```

**Example Calls:**

**Find function definitions:**
```json
{
  "tool": "Grep",
  "parameters": {
    "pattern": "function\\s+\\w+",
    "type": "js",
    "output_mode": "content"
  }
}
```

**Find React components:**
```json
{
  "tool": "Grep",
  "parameters": {
    "pattern": "export\\s+(default\\s+)?function\\s+[A-Z]",
    "glob": "**/*.tsx",
    "output_mode": "files_with_matches"
  }
}
```

**Case-insensitive search:**
```json
{
  "tool": "Grep",
  "parameters": {
    "pattern": "api.*endpoint",
    "-i": true,
    "output_mode": "content",
    "-C": 3
  }
}
```

**Use Cases:**
- Finding specific code patterns
- Locating function definitions
- Searching for API endpoints
- Finding component usage
- Discovering configuration

---

### 6. Glob Tool

**Purpose:** Find files by pattern

**Parameters:**
```javascript
{
  pattern: string,    // Glob pattern (required)
  path: string        // Directory to search (optional)
}
```

**Example Calls:**

**Find all TypeScript files:**
```json
{
  "tool": "Glob",
  "parameters": {
    "pattern": "**/*.ts"
  }
}
```

**Find React components:**
```json
{
  "tool": "Glob",
  "parameters": {
    "pattern": "src/components/**/*.tsx"
  }
}
```

**Find test files:**
```json
{
  "tool": "Glob",
  "parameters": {
    "pattern": "**/*.test.{js,ts,jsx,tsx}"
  }
}
```

**Use Cases:**
- Discovering project structure
- Finding files to read
- Locating test files
- Identifying configuration files

---

### 7. Task Tool (Agents)

**Purpose:** Launch specialized agents for complex tasks

**Parameters:**
```javascript
{
  subagent_type: string,    // Agent type (required)
  prompt: string,           // Task description (required)
  description: string,      // Short summary (required)
  model: string            // "sonnet" | "opus" | "haiku" (optional)
}
```

**Available Agents:**

#### Explore Agent
```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "Explore",
    "description": "Find authentication code",
    "prompt": "Find and explain how authentication works in this codebase. Look for auth middleware, login routes, token handling, and session management. Thoroughness: medium"
  }
}
```

#### code-refactor-master Agent
```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "code-refactor-master",
    "description": "Refactor component structure",
    "prompt": "Refactor the Dashboard.tsx component which is over 1000 lines. Break it into smaller, focused components following React best practices."
  }
}
```

#### frontend-error-fixer Agent
```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "frontend-error-fixer",
    "description": "Fix TypeScript errors",
    "prompt": "The build is failing with TypeScript errors in the UserProfile component. Investigate and fix all type errors."
  }
}
```

#### documentation-architect Agent
```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "documentation-architect",
    "description": "Document API endpoints",
    "prompt": "Create comprehensive documentation for all API endpoints in the user service, including request/response schemas, error codes, and examples."
  }
}
```

**Agent Characteristics:**
- Work autonomously with full tool access
- Can explore multiple files and patterns
- Return comprehensive findings
- Ideal for open-ended exploration
- Run in parallel when possible

---

### 8. TodoWrite Tool

**Purpose:** Track task progress and planning

**Parameters:**
```javascript
{
  todos: Array<{
    content: string,      // Task description (imperative)
    activeForm: string,   // Present continuous form
    status: "pending" | "in_progress" | "completed"
  }>
}
```

**Example Call:**
```json
{
  "tool": "TodoWrite",
  "parameters": {
    "todos": [
      {
        "content": "Create user profile component",
        "activeForm": "Creating user profile component",
        "status": "in_progress"
      },
      {
        "content": "Add profile editing functionality",
        "activeForm": "Adding profile editing functionality",
        "status": "pending"
      },
      {
        "content": "Write component tests",
        "activeForm": "Writing component tests",
        "status": "pending"
      }
    ]
  }
}
```

**Use Cases:**
- Breaking down complex tasks
- Tracking progress through multi-step work
- Demonstrating thoroughness
- Giving users visibility

**Rules:**
- Exactly ONE task in_progress at a time
- Mark completed immediately after finishing
- Update in real-time, don't batch

---

## Tool Combinations (Real Workflows)

### Workflow 1: Adding a Feature

**User:** "Add a loading spinner to the button"

```javascript
// Step 1: Find the button component
Grep({
  pattern: "Button.*component",
  glob: "**/*.tsx",
  output_mode: "files_with_matches"
})
// Result: src/components/Button.tsx

// Step 2: Read current implementation
Read({
  file_path: "/home/user/project/src/components/Button.tsx"
})
// Result: Shows current button code

// Step 3: Edit to add loading state
Edit({
  file_path: "/home/user/project/src/components/Button.tsx",
  old_string: "export function Button({ children, onClick }: ButtonProps) {\n  return (\n    <button onClick={onClick}>\n      {children}\n    </button>\n  );\n}",
  new_string: "export function Button({ children, onClick, loading }: ButtonProps) {\n  return (\n    <button onClick={onClick} disabled={loading}>\n      {loading ? <Spinner /> : children}\n    </button>\n  );\n}"
})

// Step 4: Update TypeScript types
Edit({
  file_path: "/home/user/project/src/components/Button.tsx",
  old_string: "interface ButtonProps {\n  children: React.ReactNode;\n  onClick: () => void;\n}",
  new_string: "interface ButtonProps {\n  children: React.ReactNode;\n  onClick: () => void;\n  loading?: boolean;\n}"
})

// Step 5: Verify with TypeScript
Bash({
  command: "npm run type-check",
  description: "Verify TypeScript types"
})
```

---

### Workflow 2: Debugging

**User:** "The login is broken"

```javascript
// Step 1: Find login code
Grep({
  pattern: "login",
  glob: "**/*.{ts,tsx}",
  output_mode: "files_with_matches",
  "-i": true
})

// Step 2: Read login component
Read({
  file_path: "/home/user/project/src/components/LoginForm.tsx"
})

// Step 3: Check browser console (if available)
Bash({
  command: "npm run dev",
  run_in_background: true,
  description: "Start development server"
})

// Step 4: Identify issue and fix
// (Claude analyzes and finds onClick handler issue)
Edit({
  file_path: "/home/user/project/src/components/LoginForm.tsx",
  old_string: "<button onClick={handleLogin()}>",
  new_string: "<button onClick={handleLogin}>"
})

// Step 5: Test the fix
Bash({
  command: "npm test -- LoginForm.test.tsx",
  description: "Run login form tests"
})
```

---

### Workflow 3: Exploring Codebase

**User:** "How does authentication work?"

```javascript
// Launch exploration agent
Task({
  subagent_type: "Explore",
  description: "Investigate authentication",
  prompt: "Explore how authentication is implemented in this codebase. Find the login flow, token management, middleware, and protected routes. Thoroughness: medium"
})

// Agent internally does:
// 1. Grep for "auth", "login", "token"
// 2. Read found files
// 3. Trace flow through services
// 4. Analyze patterns
// 5. Return comprehensive report
```

---

## Parallel vs Sequential Execution

### Parallel (Independent Operations)

```javascript
// These can run at the same time:
Message {
  Read({ file_path: "src/App.tsx" }),
  Read({ file_path: "src/index.tsx" }),
  Read({ file_path: "package.json" })
}
```

### Sequential (Dependent Operations)

```javascript
// These must run in order:
Message {
  Bash({ command: "git add ." })
}
// Wait for result...

Message {
  Bash({ command: "git commit -m 'feat: add feature'" })
}
// Wait for result...

Message {
  Bash({ command: "git push" })
}

// OR chain with &&:
Message {
  Bash({ command: "git add . && git commit -m 'feat: add feature' && git push" })
}
```

---

## Advanced Patterns

### Pattern 1: Multi-file Refactor

```javascript
// 1. Plan with TodoWrite
TodoWrite({
  todos: [
    { content: "Find all uses of old API", activeForm: "Finding uses", status: "in_progress" },
    { content: "Update imports", activeForm: "Updating imports", status: "pending" },
    { content: "Update function calls", activeForm: "Updating calls", status: "pending" },
    { content: "Run tests", activeForm: "Running tests", status: "pending" }
  ]
})

// 2. Find all files
Grep({
  pattern: "oldApiFunction",
  output_mode: "files_with_matches"
})

// 3. Update each file
Edit({ file_path: "file1.ts", old_string: "...", new_string: "..." })
Edit({ file_path: "file2.ts", old_string: "...", new_string: "..." })
// ... etc

// 4. Verify
Bash({ command: "npm test" })
```

### Pattern 2: Creating Full Feature

```javascript
// 1. Create service layer
Write({
  file_path: "src/services/user.service.ts",
  content: "export class UserService { ... }"
})

// 2. Create controller
Write({
  file_path: "src/controllers/user.controller.ts",
  content: "export class UserController { ... }"
})

// 3. Create routes
Write({
  file_path: "src/routes/user.routes.ts",
  content: "export const userRoutes = Router() ..."
})

// 4. Create tests
Write({
  file_path: "src/__tests__/user.test.ts",
  content: "describe('UserService', () => { ... })"
})

// 5. Run tests
Bash({ command: "npm test -- user.test.ts" })
```

---

## Tool Selection Decision Tree

```
Need to understand code?
  ├─ Know the file? → Read
  ├─ Know pattern? → Grep
  └─ Open-ended? → Task(Explore)

Need to change code?
  ├─ New file? → Write
  ├─ Existing file? → Edit
  └─ Many files? → Multiple Edits

Need to verify?
  ├─ Run tests? → Bash(npm test)
  ├─ Check types? → Bash(tsc --noEmit)
  └─ See output? → Bash(npm run dev)

Need to explore?
  ├─ Quick search? → Grep + Read
  ├─ Complex question? → Task(Explore)
  └─ Architecture review? → Task(code-architecture-reviewer)

Need to commit?
  → Bash(git status && git diff)
  → Bash(git add . && git commit)
```

---

## Error Handling

Tools return errors that Claude analyzes:

### Edit Tool Error
```json
{
  "error": "String not found in file"
}
```
**Claude's response:** Read file again, find correct string, retry Edit

### Bash Tool Error
```json
{
  "stderr": "npm ERR! Test failed",
  "exit_code": 1
}
```
**Claude's response:** Read test output, identify failure, fix code, retry

### Grep No Results
```json
{
  "matches": []
}
```
**Claude's response:** Try different pattern or broaden search

---

## Summary

Claude Code's power comes from:

1. **Right tool for the job**: Read vs Grep vs Glob vs Explore
2. **Precise operations**: Edit specific strings, don't rewrite files
3. **Verification**: Always test changes
4. **Context awareness**: Read before editing
5. **Parallel execution**: Run independent operations simultaneously
6. **Agent delegation**: Use specialized agents for complex tasks

**The result:** An AI that can navigate, understand, and modify your codebase effectively and safely.
