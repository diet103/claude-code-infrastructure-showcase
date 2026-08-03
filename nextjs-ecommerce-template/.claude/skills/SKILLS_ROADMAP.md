# Skills Roadmap - Next.js eCommerce Project

This document outlines all potential Claude Code skills for the eCommerce project. Implement skills **as you need them** during development rather than all upfront.

## Current Skills ✅

### `nextjs-ecommerce-guidelines` (Active)
**Status:** ✅ Implemented
**Auto-Activates:** When working with `.tsx`, `.ts`, CSS files, or mentioning components
**Covers:**
- Component patterns (DRY, SRP)
- Design tokens & styling
- CSS Modules (no inline styles)
- TypeScript standards
- File organization (features/ vs components/)
- WooCommerce integration basics

---

## Planned Skills 📋

### Priority: ESSENTIAL (Implement First)

#### 1. `nextjs-api-routes` ⭐⭐⭐
**When to Implement:** When building your first API route (products, cart, checkout)
**Auto-Activates:**
- Files in `app/api/**/*.ts`
- Keywords: "API route", "endpoint", "route handler"

**Would Cover:**
- Route handler structure (GET, POST, PUT, DELETE)
- Request/response patterns
- Error handling & status codes
- Input validation with Zod
- WooCommerce client usage patterns
- Stripe webhook handling
- CORS & security headers
- Rate limiting patterns
- Response formatting standards

**Example Enforcements:**
```typescript
// ✅ REQUIRED pattern
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Message' }, { status: 500 });
  }
}

// ❌ BLOCKED - no error handling
export async function GET() {
  const data = await fetchData(); // What if this fails?
  return NextResponse.json(data);
}
```

---

#### 2. `error-handling-patterns` ⭐⭐⭐
**When to Implement:** Before going to production
**Auto-Activates:**
- Keywords: "error", "exception", "try-catch"
- Error boundary components
- API error handling

**Would Cover:**
- Error boundaries (React)
- API error handling
- User-friendly error messages
- Sentry/monitoring integration
- Error logging best practices
- Retry strategies
- Fallback UI patterns

**Example Enforcements:**
```typescript
// ✅ REQUIRED - user-friendly messages
catch (error) {
  setError('Unable to load products. Please try again.');
  logError(error); // Track for monitoring
}

// ❌ BLOCKED - exposing technical details
catch (error) {
  setError(error.message); // Could expose sensitive info
}
```

---

#### 3. `notification-system` ⭐⭐⭐
**When to Implement:** When adding first success/error notification
**Auto-Activates:**
- Keywords: "toast", "notification", "alert", "flash message"
- Notification component files

**Would Cover:**
- Toast/notification patterns
- Success/error/warning/info variants
- Position & duration standards
- Accessibility (ARIA live regions)
- Animation patterns (using design tokens)
- Queue management (multiple notifications)
- Auto-dismiss vs manual close

**Would Create:**
```
components/
  Toast/
    Toast.tsx
    Toast.module.css
    ToastContainer.tsx
hooks/
  useToast.ts
```

**Example Enforcements:**
```typescript
// ✅ REQUIRED - use toast system
const { showSuccess, showError } = useToast();
showSuccess('Product added to cart');

// ❌ BLOCKED - don't use window.alert
window.alert('Product added');
```

---

### Priority: HIGH (Implement Early)

#### 4. `cart-checkout-patterns` ⭐⭐
**When to Implement:** When building cart/checkout features
**Auto-Activates:**
- Files in `features/cart/` or `features/checkout/`
- Keywords: "cart", "checkout", "order"

**Would Cover:**
- Cart state management patterns
- Local storage sync
- Optimistic updates
- Cart calculations (totals, tax, shipping)
- Checkout flow structure
- Payment integration patterns
- Order confirmation handling
- Inventory validation

**Example Enforcements:**
```typescript
// ✅ REQUIRED - optimistic update with rollback
const addToCart = async (product) => {
  // Update UI immediately
  setCart(prev => [...prev, product]);

  try {
    await api.addToCart(product.id);
  } catch (error) {
    // Rollback on failure
    setCart(prev => prev.filter(p => p.id !== product.id));
    showError('Failed to add to cart');
  }
};
```

---

#### 5. `authentication-patterns` ⭐⭐
**When to Implement:** When adding user accounts/auth
**Auto-Activates:**
- Files in `features/auth/` or `app/api/auth/`
- Keywords: "login", "signup", "authentication", "session"

**Would Cover:**
- NextAuth.js patterns (if using)
- JWT token handling
- Protected routes/pages
- Auth middleware patterns
- Password validation
- Session management
- Role-based access control
- Logout handling

---

#### 6. `form-validation` ⭐⭐
**When to Implement:** When building complex forms (checkout, account)
**Auto-Activates:**
- Keywords: "validation", "form validation"
- Form component files

**Would Cover:**
- Zod schema validation
- Client-side validation patterns
- Real-time vs on-submit validation
- Error message display
- Field-level vs form-level errors
- Async validation (check email exists)
- Custom validators

**Example Enforcements:**
```typescript
// ✅ REQUIRED - Zod schema
const checkoutSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\d{10}$/),
});

// ❌ BLOCKED - manual validation
if (!email.includes('@')) {
  setError('Invalid email');
}
```

---

### Priority: MEDIUM (Implement Mid-Development)

#### 7. `testing-guidelines` ⭐
**When to Implement:** Before major features (checkout, payments)
**Auto-Activates:**
- Files in `__tests__/` or `*.test.ts`
- Keywords: "test", "unit test", "e2e"

**Would Cover:**
- Jest configuration
- React Testing Library patterns
- Component testing best practices
- API route testing
- Mock patterns (WooCommerce, Stripe)
- E2E test structure (Playwright)
- Test coverage standards

---

#### 8. `middleware-patterns`
**When to Implement:** When adding auth middleware or request logging
**Auto-Activates:**
- Files: `middleware.ts`
- Keywords: "middleware"

**Would Cover:**
- Middleware execution order
- Auth middleware patterns
- Request logging
- Rate limiting
- Redirect patterns
- Header manipulation
- Performance monitoring

---

#### 9. `email-templates`
**When to Implement:** When sending order confirmations, etc.
**Auto-Activates:**
- Files in `emails/` or `lib/email/`
- Keywords: "email", "send email"

**Would Cover:**
- Email service integration (SendGrid, Resend, etc.)
- Template structure
- HTML email patterns
- Transactional email types
- Email testing strategies
- Unsubscribe handling

---

#### 10. `data-fetching-patterns`
**When to Implement:** When implementing complex data needs
**Auto-Activates:**
- Keywords: "fetch", "API call", "data fetching"

**Would Cover:**
- Server Components vs Client Components
- When to use each pattern
- Loading states
- Error states
- Caching strategies
- Revalidation patterns
- Streaming (Suspense)

---

### Priority: MEDIUM-LOW (Pre-Production)

#### 11. `performance-optimization`
**When to Implement:** Before production launch
**Auto-Activates:**
- Keywords: "performance", "optimization", "slow"

**Would Cover:**
- Image optimization (Next.js Image)
- Code splitting patterns
- Dynamic imports
- Bundle analysis
- Lazy loading
- Memoization (useMemo, useCallback)
- Virtual scrolling for long lists
- Web Vitals monitoring

---

#### 12. `security-best-practices`
**When to Implement:** Before production, during security review
**Auto-Activates:**
- Keywords: "security", "XSS", "CSRF"

**Would Cover:**
- Input sanitization
- XSS prevention
- CSRF tokens
- Content Security Policy
- Rate limiting
- API key protection
- Secure headers
- SQL injection prevention (via Prisma/ORM)
- Payment security (PCI compliance)

---

#### 13. `seo-optimization`
**When to Implement:** Before marketing/launch
**Auto-Activates:**
- Keywords: "SEO", "meta tags", "sitemap"

**Would Cover:**
- Metadata API patterns
- Open Graph tags
- Structured data (JSON-LD)
- Sitemap generation
- Robots.txt
- Canonical URLs
- Image alt text standards

---

### Priority: LOW (Nice to Have)

#### 14. `accessibility-standards`
**When to Implement:** During accessibility audit
**Auto-Activates:**
- Keywords: "accessibility", "a11y", "ARIA"

**Would Cover:**
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader testing
- Color contrast standards
- Skip links
- Alt text requirements

---

#### 15. `internationalization`
**When to Implement:** When adding multi-language support
**Auto-Activates:**
- Keywords: "i18n", "translation", "locale"

**Would Cover:**
- next-intl patterns
- Translation file structure
- Currency formatting
- Date/time localization
- RTL support
- Language switching

---

#### 16. `analytics-tracking`
**When to Implement:** When implementing analytics
**Auto-Activates:**
- Keywords: "analytics", "tracking", "Google Analytics"

**Would Cover:**
- Google Analytics 4 setup
- Event tracking patterns
- Conversion tracking
- Custom events
- Privacy considerations (GDPR)
- Cookie consent

---

#### 17. `database-patterns`
**When to Implement:** If adding database (beyond WooCommerce)
**Auto-Activates:**
- Files: `lib/db/`, `prisma/`
- Keywords: "database", "Prisma", "query"

**Would Cover:**
- Prisma patterns
- Query optimization
- Transaction handling
- Connection pooling
- Migration patterns
- Seeding data

---

## Implementation Strategy 🎯

### **Phase 1: MVP (Weeks 1-4)**
Implement as needed:
1. ✅ `nextjs-ecommerce-guidelines` (already done)
2. `nextjs-api-routes` (when building first API route)
3. `notification-system` (when adding first success message)

### **Phase 2: Core Features (Weeks 5-8)**
4. `cart-checkout-patterns` (when building cart)
5. `error-handling-patterns` (before checkout goes live)
6. `form-validation` (for checkout form)

### **Phase 3: User Accounts (Weeks 9-12)**
7. `authentication-patterns` (if adding accounts)
8. `email-templates` (for order confirmations)

### **Phase 4: Production Ready (Weeks 13-16)**
9. `testing-guidelines` (before major release)
10. `security-best-practices` (security audit)
11. `performance-optimization` (pre-launch)

### **Phase 5: Launch & Beyond**
12. `seo-optimization` (marketing launch)
13. `analytics-tracking` (measure success)
14. Additional skills as needed

---

## How to Add a Skill

When you're ready to implement a skill:

### **Option 1: Ask Me**
```
You: "Let's add the API routes skill now"
Me: *Creates complete skill with SKILL.md and skill-rules.json*
```

### **Option 2: DIY**
```bash
# Create skill directory
mkdir -p .claude/skills/skill-name

# Create SKILL.md with patterns
# Create skill-rules.json with triggers
# Test auto-activation
```

---

## Skill Interaction Matrix

Some skills work together:

| Skill | Works With | Enhances |
|-------|-----------|----------|
| `nextjs-api-routes` | `error-handling-patterns` | Better API error handling |
| `cart-checkout-patterns` | `notification-system` | Cart feedback messages |
| `form-validation` | `notification-system` | Validation feedback |
| `authentication-patterns` | `middleware-patterns` | Protected routes |
| `error-handling-patterns` | `notification-system` | User-friendly errors |
| `testing-guidelines` | ALL | Validates patterns work |

---

## Current Template Status

**Completed:**
- ✅ Design token system
- ✅ Foundational components (6)
- ✅ WooCommerce integration layer
- ✅ Stripe integration layer
- ✅ Example products feature
- ✅ FilterSidebar component
- ✅ `nextjs-ecommerce-guidelines` skill

**Next Priorities:**
1. Build first API route → Add `nextjs-api-routes` skill
2. Add success messages → Add `notification-system` skill
3. Build cart → Add `cart-checkout-patterns` skill

---

## Notes

- Skills can be added **incrementally** - no need to implement all upfront
- Skills **auto-activate** based on what you're working on
- Skills can **reference each other** for complementary patterns
- **Keep skills focused** - better to have 10 focused skills than 3 giant ones
- Skills **evolve** - update them as you learn better patterns

---

**Last Updated:** 2025-11-07
**Next Review:** After implementing 3 more skills
