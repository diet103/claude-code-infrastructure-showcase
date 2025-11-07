# How to Add a New Skill

Quick guide for implementing skills from the roadmap when you need them.

## Method 1: Ask Claude (Recommended) 🤖

Simply ask and Claude will create everything:

```
You: "Let's add the API routes skill now"

Claude: *Creates:*
  ✅ .claude/skills/nextjs-api-routes/SKILL.md
  ✅ Updates skill-rules.json with triggers
  ✅ Tests auto-activation
```

Claude knows:
- The skill structure
- Proper trigger patterns
- What should be enforced
- How to integrate with existing skills

---

## Method 2: DIY (Advanced) 🛠️

### Step 1: Create Skill Directory

```bash
mkdir -p .claude/skills/your-skill-name
cd .claude/skills/your-skill-name
```

### Step 2: Create SKILL.md

```markdown
---
name: your-skill-name
version: 1.0.0
description: Brief description of what this skill enforces
type: guardrail
enforcement: block
---

# Your Skill Name

**PURPOSE**: What this skill enforces and why

## Core Principles

1. Principle 1
2. Principle 2

## Patterns

### Pattern Name

Description of the pattern

✅ **REQUIRED**:
```code
// Good example
```

❌ **FORBIDDEN**:
```code
// Bad example
```

## Common Mistakes

1. Mistake 1
2. Mistake 2

## Examples

[Full working examples]

---

**Remember**: Key takeaway message
```

### Step 3: Update skill-rules.json

Add your skill to `.claude/skills/skill-rules.json`:

```json
{
  "your-skill-name": {
    "type": "guardrail",
    "enforcement": "block",
    "priority": "high",
    "description": "Brief description",
    "promptTriggers": {
      "keywords": [
        "keyword1",
        "keyword2",
        "keyword3"
      ],
      "intentPatterns": [
        "(create|add).*?(thing)",
        "how.*?(pattern)"
      ]
    },
    "fileTriggers": {
      "pathPatterns": [
        "src/specific/path/**/*.ts",
        "**/*.pattern.ts"
      ],
      "contentPatterns": [
        "import.*from.*library",
        "specific pattern"
      ]
    },
    "blockMessage": "⚠️ This requires skill. Auto-loaded.",
    "skipConditions": {
      "paths": [
        "node_modules/**",
        ".next/**"
      ]
    }
  }
}
```

### Step 4: Test Activation

Create a test file that should trigger the skill:

```bash
# Example: Testing API route skill
mkdir -p src/app/api/test
touch src/app/api/test/route.ts
```

Then ask Claude to create something that should trigger it:

```
You: "Create a GET route in src/app/api/test/route.ts"
```

Claude should mention the skill activated.

---

## Skill Configuration Options

### Enforcement Levels

```json
"enforcement": "block"    // Required (strictest)
"enforcement": "suggest"  // Recommended (medium)
"enforcement": "warn"     // Informational (lenient)
```

### Priority Levels

```json
"priority": "high"    // Always enforced
"priority": "medium"  // Usually enforced
"priority": "low"     // Contextual
```

### Trigger Types

#### Keywords
Simple word matching:
```json
"keywords": ["component", "API", "route"]
```

Activates when you say:
- "Create a new component"
- "Add an API route"

#### Intent Patterns
Regex for user intent:
```json
"intentPatterns": [
  "(create|add|build).*?(component|feature)",
  "how.*?(style|organize)"
]
```

Matches:
- "Create a new feature"
- "How should I style this?"

#### File Path Patterns
Glob patterns for file paths:
```json
"pathPatterns": [
  "src/app/api/**/*.ts",
  "src/components/**/*.tsx"
]
```

Activates when editing these files.

#### Content Patterns
Regex for file contents:
```json
"contentPatterns": [
  "import.*from.*'next'",
  "export async function GET"
]
```

Activates when file contains these patterns.

---

## Skill Structure Best Practices

### Keep SKILL.md Under 500 Lines

If longer, split into resources:

```
skills/
  your-skill-name/
    SKILL.md           # Main guide (<500 lines)
    resources/
      advanced.md      # Deep dive topics
      examples.md      # Full examples
      patterns.md      # Pattern library
```

### Use Progressive Disclosure

**Main SKILL.md** should have:
- Quick reference
- Core principles
- Common patterns
- Links to resources for details

**Resources/** should have:
- Detailed explanations
- Edge cases
- Advanced patterns
- Complex examples

### Clear Examples

Always show both:

```typescript
// ✅ CORRECT - Do this
const good = usePattern();

// ❌ WRONG - Don't do this
const bad = antiPattern();
```

---

## Testing Your Skill

### Test Checklist

✅ **Activation Tests**
- [ ] Activates on keywords
- [ ] Activates on file paths
- [ ] Activates on content patterns
- [ ] Doesn't activate when it shouldn't

✅ **Enforcement Tests**
- [ ] Blocks non-compliant patterns (if block mode)
- [ ] Suggests alternatives
- [ ] Provides clear error messages

✅ **Documentation Tests**
- [ ] Examples are accurate
- [ ] Patterns are clear
- [ ] Links work
- [ ] No typos

### Test Conversation

```
You: "Create a [thing the skill should handle]"

Expected:
- Skill activates
- Claude mentions it
- Claude follows the patterns
- Output matches skill rules
```

---

## Skill Maintenance

### When to Update

Update your skill when:
- You discover better patterns
- You find common mistakes
- You add new features
- Team agrees on new standards

### Version Control

Update the version in SKILL.md frontmatter:

```markdown
---
version: 1.1.0  # Increment when updating
---
```

Keep a changelog in the skill:

```markdown
## Changelog

### v1.1.0 (2025-11-15)
- Added pattern for X
- Updated Y examples
- Fixed Z issue
```

---

## Common Issues

### Skill Not Activating

**Check:**
1. Is the file path in `pathPatterns`?
2. Are keywords correct?
3. Is skill-rules.json valid JSON?
4. Restart Claude Code session

### Skill Too Strict

**Solutions:**
1. Change `"enforcement": "suggest"`
2. Add more skip conditions
3. Make patterns more specific

### Skill Conflicts

If two skills conflict:
1. Use priority levels
2. Make triggers more specific
3. Document interaction in both skills

---

## Example: Adding the Notification Skill

Let's walk through adding `notification-system` skill:

### 1. Ask Claude

```
You: "I need to add success messages when users add items to cart.
     Let's implement the notification-system skill from the roadmap."

Claude: "I'll create the notification-system skill with:
         - Toast component patterns
         - useToast hook pattern
         - Design token styling
         - Accessibility standards

         Creating SKILL.md and updating skill-rules.json..."
```

### 2. Claude Creates Files

```
.claude/skills/
  notification-system/
    SKILL.md          # Toast patterns, accessibility rules
  skill-rules.json    # Updated with notification triggers
```

### 3. Test It

```
You: "Add a success message when product is added to cart"

Claude: *notification-system skill activates*
        "I'll use the Toast component pattern from the skill:

         const { showSuccess } = useToast();
         showSuccess('Product added to cart');

         This follows the notification-system skill patterns..."
```

### 4. It Works!

Now whenever you:
- Say "toast", "notification", "alert"
- Work on notification components
- Add user feedback

The skill automatically enforces:
- Proper toast structure
- Design tokens for styling
- Accessibility (ARIA live regions)
- Consistent messaging patterns

---

## Quick Reference

| Action | Command |
|--------|---------|
| Add skill via Claude | "Let's add the [skill-name] skill" |
| Create skill manually | `mkdir .claude/skills/skill-name` |
| Edit skill | Edit `SKILL.md` and `skill-rules.json` |
| Test activation | Create trigger file or use keywords |
| Check if active | Claude will mention it in response |
| Disable temporarily | Remove from `skill-rules.json` |
| Update skill | Edit SKILL.md, increment version |

---

## Resources

- **Roadmap**: See `SKILLS_ROADMAP.md` for all planned skills
- **Examples**: Check existing `nextjs-ecommerce-guidelines` skill
- **Showcase Repo**: `/claude-code-infrastructure-showcase/.claude/skills/`

---

**Pro Tip**: Start simple! Add skills one at a time as you need them. It's better to have 3 well-used skills than 15 ignored ones.
