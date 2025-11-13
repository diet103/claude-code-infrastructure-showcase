# Claude Code: Live Demonstration

This file shows **actual examples** of Claude Code working, demonstrating the conversation flow and tool usage.

---

## Example 1: Creating a Utility Function

### **Conversation**

**You:** Create a function to validate email addresses in `src/utils/validation.js`

### **What Claude Code Does**

```
🔧 Tool: Read
   File: src/utils/validation.js
   Purpose: Understanding existing code structure
```

```javascript
// Sees existing code like:
export function validatePhone(phone) {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
}
```

```
🔧 Tool: Edit
   File: src/utils/validation.js
   Action: Adding new function following existing patterns
```

```javascript
// Claude adds:
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

**Result:** Function created matching your project's style ✓

---

## Example 2: Finding and Fixing Bugs

### **Conversation**

**You:** The login button isn't working, can you debug it?

### **What Claude Code Does**

```
🔧 Tool: Grep
   Pattern: "login.*button"
   Purpose: Finding login button code
```

Finds: `src/components/LoginForm.tsx:42`

```
🔧 Tool: Read
   File: src/components/LoginForm.tsx
   Lines: 1-100
```

```typescript
// Claude sees the issue:
<button onClick={handleLogin()}>  // ❌ Calling function immediately!
  Login
</button>
```

```
🔧 Tool: Edit
   File: src/components/LoginForm.tsx
   Fix: Remove parentheses from onClick handler
```

```typescript
// Claude fixes it:
<button onClick={handleLogin}>  // ✓ Passes function reference
  Login
</button>
```

```
🔧 Tool: Bash
   Command: npm test -- LoginForm.test.tsx
   Purpose: Verifying the fix works
```

**Result:** Bug identified and fixed ✓

---

## Example 3: Refactoring Code

### **Conversation**

**You:** Refactor this class component to use React hooks

**You provide:**
```typescript
class UserProfile extends React.Component {
  state = { user: null, loading: true };

  componentDidMount() {
    fetchUser().then(user => {
      this.setState({ user, loading: false });
    });
  }

  render() {
    if (this.state.loading) return <Spinner />;
    return <div>{this.state.user.name}</div>;
  }
}
```

### **What Claude Code Does**

```
🔧 Tool: Edit
   File: src/components/UserProfile.tsx
   Action: Converting to functional component with hooks
```

```typescript
// Claude refactors to:
function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser().then(user => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner />;
  return <div>{user.name}</div>;
}
```

**Result:** Modern hooks-based component ✓

---

## Example 4: Adding Tests

### **Conversation**

**You:** Write tests for the validateEmail function

### **What Claude Code Does**

```
🔧 Tool: Glob
   Pattern: "**/*.test.js"
   Purpose: Finding test file location
```

Finds: `src/utils/__tests__/validation.test.js`

```
🔧 Tool: Read
   File: src/utils/__tests__/validation.test.js
   Purpose: Understanding test patterns
```

```
🔧 Tool: Edit
   File: src/utils/__tests__/validation.test.js
   Action: Adding comprehensive test suite
```

```javascript
// Claude adds:
describe('validateEmail', () => {
  it('should accept valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@domain.co.uk')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(validateEmail('')).toBe(false);
  });
});
```

```
🔧 Tool: Bash
   Command: npm test -- validation.test.js
   Purpose: Running tests to ensure they pass
```

**Result:** Complete test coverage ✓

---

## Example 5: Using Specialized Agents

### **Conversation**

**You:** How does authentication work in this codebase?

### **What Claude Code Does**

```
🔧 Tool: Task
   Agent: Explore
   Task: Find and explain authentication implementation
   Thoroughness: medium
```

**The agent autonomously:**
1. Searches for auth-related files
2. Reads authentication middleware
3. Traces login flow through services
4. Examines token handling
5. Reviews session management

**Agent returns:**

> **Authentication Architecture**
>
> This project uses JWT cookie-based authentication:
>
> 1. **Login Flow** (`src/services/auth.service.ts:45`)
>    - User submits credentials
>    - Server validates via Keycloak
>    - JWT stored in HTTP-only cookie
>
> 2. **Middleware** (`src/middleware/auth.middleware.ts:12`)
>    - Extracts token from cookie
>    - Validates signature and expiration
>    - Attaches user to request object
>
> 3. **Protected Routes** (`src/routes/api.routes.ts:89`)
>    - Use `authenticate()` middleware
>    - Automatically reject unauthenticated requests

**Result:** Comprehensive explanation from exploring codebase ✓

---

## Example 6: Git Workflow

### **Conversation**

**You:** Commit these changes

### **What Claude Code Does**

```
🔧 Tool: Bash (parallel)
   Commands:
   - git status        # See what changed
   - git diff          # Review the changes
   - git log -5        # Check commit style
```

**Claude analyzes:**
- Modified: `src/utils/validation.js`
- Modified: `src/utils/__tests__/validation.test.js`
- Commit style: Use conventional commits

```
🔧 Tool: Bash (sequential)
   Commands:
   1. git add src/utils/
   2. git commit -m "feat(validation): add email validation with tests"
   3. git status  # Verify success
```

**Result:** Clean commit following project conventions ✓

---

## Example 7: Working with Skills

Skills are reusable prompts that automatically activate based on context.

### **Conversation**

**You:** Create a new API endpoint for user profiles

### **What Claude Code Does**

```
🎯 Skill Activated: backend-dev-guidelines
   Trigger: Creating API route
   Provides: Backend architecture patterns
```

**The skill informs Claude to:**
1. Follow layered architecture (routes → controllers → services → repositories)
2. Use Zod for input validation
3. Implement proper error handling with Sentry
4. Add TypeScript types
5. Use dependency injection

```
🔧 Tool: Write
   File: src/routes/profile.routes.ts
```

```typescript
// Claude creates following skill guidelines:
import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const profileController = new ProfileController();

router.get(
  '/profile/:userId',
  authenticate(),
  profileController.getProfile.bind(profileController)
);

export default router;
```

```
🔧 Tool: Write
   File: src/controllers/profile.controller.ts
```

```typescript
// Following BaseController pattern from skill:
import { BaseController } from './base.controller';
import { ProfileService } from '../services/profile.service';

export class ProfileController extends BaseController {
  constructor(private profileService = new ProfileService()) {
    super();
  }

  async getProfile(req, res) {
    return this.handleRequest(req, res, async () => {
      const { userId } = req.params;
      return await this.profileService.getUserProfile(userId);
    });
  }
}
```

**Result:** Complete endpoint following all project patterns ✓

---

## Key Takeaways

### **1. Claude Code is Context-Aware**
- Reads multiple files to understand relationships
- Follows your existing patterns
- Adapts to your project structure

### **2. Claude Code is Precise**
- Makes exact edits, not full file rewrites
- Preserves formatting and style
- Only changes what needs changing

### **3. Claude Code is Verifiable**
- Shows every tool it uses
- Runs tests to confirm changes work
- You review and approve major changes

### **4. Claude Code is Extensible**
- **Skills**: Teach project patterns
- **Agents**: Handle complex exploration
- **Commands**: Create custom workflows
- **Hooks**: Automate validation

### **5. Claude Code Thinks Step-by-Step**
```
User request
  → Understand context (Read/Grep)
  → Plan approach (TodoWrite)
  → Make changes (Edit/Write)
  → Verify (Bash/tests)
  → Report results
```

---

## Try These Commands with Claude Code

```bash
# Exploration
"What does this codebase do?"
"Find all API endpoints"
"Explain the authentication flow"

# Implementation
"Add a dark mode toggle"
"Create a user settings page"
"Implement rate limiting"

# Debugging
"Why is this test failing?"
"Fix the TypeScript errors"
"The button click isn't working"

# Refactoring
"Extract this into a custom hook"
"Split this file into smaller modules"
"Convert to TypeScript"

# Git operations
"Commit these changes"
"Create a pull request"
"Review what changed"

# Testing
"Write tests for this component"
"Run the test suite"
"Add integration tests"
```

---

## How to Get Started

1. **Install Claude Code**
   ```bash
   npm install -g claude-code
   ```

2. **Navigate to your project**
   ```bash
   cd your-project
   ```

3. **Start Claude Code**
   ```bash
   claude-code
   ```

4. **Ask for help**
   ```
   "Help me add user authentication"
   ```

5. **Watch Claude work through:**
   - Reading your code
   - Understanding patterns
   - Making changes
   - Running tests
   - Creating commits

That's Claude Code! An AI pair programmer that understands your codebase and helps you build better software faster.
