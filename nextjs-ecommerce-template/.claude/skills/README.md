# Claude Code Skills

This directory contains Claude Code skills that automatically enforce development patterns and best practices.

## Installed Skills

### nextjs-ecommerce-guidelines

**Purpose**: Enforces Next.js eCommerce development patterns including DRY, SRP, no inline styles, and design token usage.

**Auto-Activation Triggers**:

1. **Keywords**: When you mention:
   - component, create component, new component
   - style, styling, css, design
   - button, card, form, input, modal, table
   - woocommerce, product, cart, checkout

2. **File Patterns**: When you edit:
   - Any `.tsx` or `.ts` file in `src/`
   - Any `.css` file (especially `.module.css`)
   - Files in `src/components/` or `src/features/`

3. **Code Patterns**: When your code contains:
   - `import ... from '~components/...'`
   - `className=`
   - `styles.`
   - `React.FC`

## How It Works

### Automatic Activation

You **don't need to manually load the skill**. When you:

```
You: "Let's create a new ProductCard component"
```

Claude automatically loads the skill and will:
- ✅ Enforce Component.module.css pattern
- ✅ Require design tokens (no hardcoded values)
- ✅ Ensure TypeScript types
- ✅ Follow the component structure pattern
- ✅ Block inline styles

### Enforcement Level

The skill has `"enforcement": "block"` which means:
- Claude will **require** following the patterns
- You'll see warnings if attempting non-compliant patterns
- The skill content becomes part of Claude's instructions

### Manual Verification

You can verify the skill is active by looking for references to:
- Design tokens (var(--color-primary-600))
- Component.module.css patterns
- TypeScript interface requirements
- DRY/SRP principles

## Example Interactions

### ✅ Skill Auto-Activates

```
You: "Create a new OrderCard component"
Claude: *Skill activates automatically*
Claude: "I'll create OrderCard following the established patterns.
        Using Card foundational component, design tokens only..."
```

### ✅ Skill Enforces Patterns

```
You: "Add some inline styles to the button"
Claude: "I need to follow the nextjs-ecommerce-guidelines skill.
        Inline styles are not allowed. Let me use Button.module.css
        with design tokens instead..."
```

### ✅ Skill Provides Guidance

```
You: "How should I structure a new Cart feature?"
Claude: *Skill activates*
Claude: "Following the features-first architecture pattern:
        features/cart/
          api/
          components/
          hooks/
          types/
        ..."
```

## Configuration

The skill configuration is in `skill-rules.json`:

```json
{
  "nextjs-ecommerce-guidelines": {
    "type": "guardrail",
    "enforcement": "block",
    "priority": "high"
  }
}
```

### Enforcement Levels

- `"block"` - Required, prevents non-compliant code
- `"suggest"` - Recommended, but can be overridden
- `"warn"` - Informational only

### Priority Levels

- `"high"` - Always enforced
- `"medium"` - Usually enforced
- `"low"` - Contextual enforcement

## Skill Content

The main skill documentation is in:
`nextjs-ecommerce-guidelines/SKILL.md`

This contains:
- Component patterns
- CSS Module structure
- TypeScript standards
- Data fetching patterns
- WooCommerce integration rules
- Common mistakes to avoid

## Customizing the Skill

### Add New Triggers

Edit `skill-rules.json` to add new keywords or patterns:

```json
"keywords": [
  "component",
  "your-new-keyword"
]
```

### Change Enforcement

```json
"enforcement": "suggest"  // More lenient
```

### Skip Certain Paths

```json
"skipConditions": {
  "paths": [
    "src/legacy/**"  // Skip legacy code
  ]
}
```

## Benefits

✅ **Consistency**: Every component follows the same patterns
✅ **No Reminders Needed**: Skill auto-activates when relevant
✅ **Guardrails**: Prevents common mistakes before they happen
✅ **Documentation**: Patterns are always accessible
✅ **Onboarding**: New team members see patterns immediately

## Troubleshooting

### Skill Not Activating

1. Check you're working in `src/` directory
2. Verify file extensions match triggers (`.tsx`, `.ts`, `.css`)
3. Use keywords like "component", "create", "style"

### Too Strict

If the skill is too restrictive, you can:
1. Change `"enforcement": "suggest"` in skill-rules.json
2. Add skip paths for specific directories
3. Adjust the priority to "medium" or "low"

### Not Strict Enough

If you want stronger enforcement:
1. Ensure `"enforcement": "block"`
2. Add more trigger patterns
3. Set `"priority": "high"`

## Best Practices

1. **Let it activate naturally** - Don't manually load it
2. **Trust the guardrails** - They prevent future tech debt
3. **Reference SKILL.md** - For detailed pattern documentation
4. **Update triggers** - As your project grows, add new keywords
5. **Keep it current** - Update SKILL.md with new patterns

---

**The skill is your automated pair programmer enforcing best practices! 🤖**
