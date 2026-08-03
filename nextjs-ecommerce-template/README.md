# Next.js + WooCommerce eCommerce Template

A production-ready Next.js eCommerce template with WooCommerce backend integration, strict architectural patterns, and comprehensive Claude Code skill enforcement.

## 🎯 Core Principles

This template enforces four critical principles from day one:

1. **DRY (Don't Repeat Yourself)** - Reusable components, hooks, and utilities
2. **SRP (Single Responsibility Principle)** - Clear separation of concerns
3. **NO Inline Styles** - All styling through Component.module.css
4. **Design Tokens Only** - No hardcoded colors, spacing, or values

## ✨ Features

- ✅ **Next.js 14** with App Router
- ✅ **TypeScript** with strict type checking
- ✅ **WooCommerce Integration** via REST API
- ✅ **Stripe Payments** ready
- ✅ **Design Token System** for consistent UX
- ✅ **Foundational Components** (Button, Card, Input, Form, Table, Modal)
- ✅ **CSS Modules** with design token enforcement
- ✅ **Features-First Architecture** for scalability
- ✅ **Claude Code Skill** for pattern enforcement
- ✅ **Full TypeScript Coverage**
- ✅ **Responsive Design** out of the box
- ✅ **Accessibility** built-in

## 📁 Project Structure

```
nextjs-ecommerce-template/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── api/               # API routes
│   │
│   ├── components/            # Reusable UI components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── index.ts
│   │   ├── Card/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Form/
│   │   └── Table/
│   │
│   ├── features/              # Domain-specific features
│   │   └── products/
│   │       ├── api/           # API service layer
│   │       ├── components/    # Feature components
│   │       ├── hooks/         # Custom hooks
│   │       └── types/         # TypeScript types
│   │
│   ├── lib/                   # Shared libraries
│   │   ├── woocommerce/       # WooCommerce client
│   │   ├── stripe/            # Stripe client
│   │   └── utils/             # Utilities
│   │
│   ├── hooks/                 # App-level hooks
│   ├── types/                 # Global types
│   │
│   └── styles/                # Global styles
│       ├── tokens.css         # Design tokens
│       ├── tokens.ts          # TypeScript tokens
│       └── globals.css        # Global styles
│
├── .claude/                   # Claude Code configuration
│   └── skills/
│       └── nextjs-ecommerce-guidelines/
│           └── SKILL.md       # Development guidelines
│
├── package.json
├── tsconfig.json
├── next.config.js
├── .eslintrc.json
├── .prettierrc
└── .env.example
```

## 🚀 Getting Started

### 1. Copy Template to Your Project

```bash
# From the showcase repository
cp -r nextjs-ecommerce-template/* your-project-name/
cd your-project-name
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# WooCommerce Configuration
NEXT_PUBLIC_WOOCOMMERCE_URL=https://your-woocommerce-site.com
WOOCOMMERCE_CONSUMER_KEY=your_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_consumer_secret

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
STRIPE_SECRET_KEY=your_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## 🎨 Design Token System

All styling MUST use design tokens from `src/styles/tokens.css`.

### Available Tokens

```css
/* Colors */
--color-primary-500
--color-secondary-600
--color-success-500
--color-error-600
--color-text-primary
--color-background

/* Spacing */
--spacing-1  /* 4px */
--spacing-4  /* 16px */
--spacing-6  /* 24px */

/* Typography */
--font-size-base
--font-weight-medium

/* And many more... */
```

### Usage Example

```css
/* Component.module.css */
.button {
  padding: var(--spacing-2) var(--spacing-4);
  background-color: var(--color-primary-600);
  color: white;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  transition: var(--transition-base);
}

.button:hover {
  background-color: var(--color-primary-700);
}
```

❌ **NEVER DO THIS**:
```css
.button {
  padding: 8px 16px;        /* Hardcoded! */
  background-color: #2196f3; /* Hardcoded! */
}
```

## 🧩 Foundational Components

Use these everywhere instead of creating new ones:

### Button

```tsx
import { Button } from '~components/Button';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>
```

### Card

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '~components/Card';

<Card variant="elevated" padding="md">
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
  <CardFooter>Footer</CardFooter>
</Card>
```

### Input

```tsx
import { Input } from '~components/Input';

<Input
  label="Email"
  type="email"
  required
  error={errors.email}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

### Form

```tsx
import { Form, FormGroup, FormActions } from '~components/Form';

<Form onSubmit={handleSubmit} error={error}>
  <FormGroup>
    <Input label="Email" type="email" />
    <Input label="Password" type="password" />
  </FormGroup>
  <FormActions>
    <Button type="submit">Submit</Button>
  </FormActions>
</Form>
```

### Modal

```tsx
import { Modal, ModalBody, ModalFooter } from '~components/Modal';

<Modal open={isOpen} onClose={handleClose} title="Confirm">
  <ModalBody>Are you sure?</ModalBody>
  <ModalFooter>
    <Button variant="outline" onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

### Table

```tsx
import { Table } from '~components/Table';

<Table
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'price', label: 'Price', align: 'right' }
  ]}
  data={products}
  striped
  hoverable
/>
```

## 🏗️ Creating New Features

### Feature Structure

```
features/
  your-feature/
    api/
      yourFeatureApi.ts      # API service layer
    components/
      YourComponent.tsx      # Feature-specific components
      YourComponent.module.css
    hooks/
      useYourFeature.ts      # Custom hooks
    types/
      index.ts               # TypeScript types
```

### Example: Creating a "Cart" Feature

1. **Create directory structure**

```bash
mkdir -p src/features/cart/{api,components,hooks,types}
```

2. **Define types** (`src/features/cart/types/index.ts`)

```tsx
export interface CartItem {
  productId: number;
  quantity: number;
  price: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}
```

3. **Create API service** (`src/features/cart/api/cartApi.ts`)

```tsx
export const addToCart = async (productId: number): Promise<Cart> => {
  const response = await fetch('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
  return response.json();
};
```

4. **Create custom hook** (`src/features/cart/hooks/useCart.ts`)

```tsx
'use client';

export const useCart = () => {
  const [cart, setCart] = useState<Cart | null>(null);

  const addItem = async (productId: number) => {
    const updatedCart = await addToCart(productId);
    setCart(updatedCart);
  };

  return { cart, addItem };
};
```

5. **Create components** with `.module.css` files

## 🔌 WooCommerce Integration

### Server-Side Only

WooCommerce API credentials MUST only be used server-side:

```tsx
// app/api/products/route.ts (✅ CORRECT)
import { getWooCommerceClient } from '~lib/woocommerce';

export async function GET() {
  const wc = getWooCommerceClient();
  const products = await wc.getProducts();
  return NextResponse.json(products);
}
```

### Client-Side API Calls

```tsx
// features/products/api/productsApi.ts (✅ CORRECT)
export const getProducts = async (): Promise<Product[]> => {
  const response = await fetch('/api/products');
  return response.json();
};
```

## 💳 Stripe Integration

### Create Payment Intent (Server-Side)

```tsx
// app/api/create-payment-intent/route.ts
import { createPaymentIntent } from '~lib/stripe/client';

export async function POST(request: Request) {
  const { amount } = await request.json();

  const paymentIntent = await createPaymentIntent(amount, 'usd');

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
  });
}
```

## 📝 Claude Code Skill

The template includes a Claude Code skill that enforces all patterns.

### Activation

The skill automatically activates when:
- Editing `.tsx` or `.ts` files in `src/`
- Creating new components
- Working with styling

### What It Enforces

- ✅ No inline styles
- ✅ Design tokens usage
- ✅ Component structure patterns
- ✅ TypeScript types
- ✅ File organization
- ✅ DRY and SRP principles

### Skill Location

`.claude/skills/nextjs-ecommerce-guidelines/SKILL.md`

## 🧪 Development Workflow

### Before Creating a Component

1. Check if a foundational component exists
2. If not, check if it belongs in `features/` or `components/`
3. Follow the component structure pattern
4. Create both `.tsx` and `.module.css` files

### Component Checklist

- ✅ TypeScript props interface with JSDoc
- ✅ Proper exports (named + default)
- ✅ CSS module with design tokens only
- ✅ No inline styles
- ✅ Responsive design
- ✅ Accessibility (ARIA labels, semantic HTML)

### Before Committing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format
```

## 🎯 Path Aliases

Use configured aliases for cleaner imports:

```tsx
import { Button } from '~components/Button';
import { Product } from '~features/products/types';
import { formatPrice } from '~lib/utils';
import { useCart } from '~hooks/useCart';
```

## 📚 Examples

### Product Card (Full Example)

See `src/features/products/components/ProductCard.tsx` for a complete example demonstrating:
- Foundational component usage (Card, Button)
- Design token styling
- TypeScript types
- Event handling
- Responsive design

### Product Grid

See `src/features/products/components/ProductGrid.tsx` for grid layout patterns.

## 🚨 Common Mistakes

### ❌ Don't Do This

```tsx
// Inline styles
<div style={{ color: 'blue', padding: 16 }}>

// Hardcoded values in CSS
.button {
  padding: 16px;
  color: #2196f3;
}

// WooCommerce on client
'use client';
const wc = getWooCommerceClient(); // ERROR!

// Missing types
function MyComponent(props) {  // No types!
```

### ✅ Do This Instead

```tsx
// CSS module with tokens
<div className={styles.container}>

// Design tokens
.button {
  padding: var(--spacing-4);
  color: var(--color-primary-600);
}

// WooCommerce in API route
export async function GET() {
  const wc = getWooCommerceClient();
}

// Proper types
interface MyComponentProps {
  name: string;
}
export const MyComponent: React.FC<MyComponentProps> = ({ name }) => {
```

## 🔧 Customization

### Modify Design Tokens

Edit `src/styles/tokens.css` to customize the design system:

```css
:root {
  --color-primary-600: #your-brand-color;
  --spacing-4: 1rem;
  /* ... */
}
```

All components will automatically update!

### Add New Foundational Components

1. Create in `src/components/NewComponent/`
2. Follow Button/Card patterns
3. Use design tokens exclusively
4. Export via `index.ts`

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [WooCommerce REST API](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Stripe API](https://stripe.com/docs/api)
- [Claude Code Documentation](https://docs.claude.com/claude-code)

## 🤝 Contributing

When adding features:

1. Follow the established patterns
2. Use design tokens exclusively
3. Maintain TypeScript coverage
4. Test responsiveness
5. Ensure accessibility

## 📄 License

MIT

---

**Built with ❤️ for maintainability, consistency, and developer happiness.**
