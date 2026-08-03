# Setup Guide - Next.js + WooCommerce eCommerce Template

This guide will help you get started with your new Next.js eCommerce project in under 10 minutes.

## Quick Start

### Step 1: Copy Template to Your Project

```bash
# From the claude-code-infrastructure-showcase repository
cp -r nextjs-ecommerce-template /path/to/your-new-project
cd /path/to/your-new-project
```

### Step 2: Initialize Git (if not already a repo)

```bash
git init
git add .
git commit -m "Initial commit from Next.js eCommerce template"
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required: Your site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Required: WooCommerce credentials
NEXT_PUBLIC_WOOCOMMERCE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxx

# Required: Stripe credentials
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 5: Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## What You Get Out of the Box

### ✅ Foundational Components

All ready to use:
- **Button** - 5 variants, 3 sizes, loading states
- **Card** - Flexible layout with header/body/footer
- **Input** - Text, email, password, textarea with validation
- **Form** - Structured forms with error handling
- **Modal** - Accessible dialogs with focus trapping
- **Table** - Sortable, responsive data tables

### ✅ Design Token System

Complete design system in `src/styles/tokens.css`:
- Colors (primary, secondary, success, error, neutrals)
- Spacing scale (4px base)
- Typography (sizes, weights, line heights)
- Borders, shadows, transitions
- Dark mode support

### ✅ WooCommerce Integration

Type-safe client in `src/lib/woocommerce/`:
- Products CRUD
- Orders management
- Customer management
- Full TypeScript types

### ✅ Stripe Integration

Payment helpers in `src/lib/stripe/`:
- Payment intents
- Checkout sessions
- Webhook verification

### ✅ Example Feature

Complete products feature demonstrating all patterns:
- API service layer
- Custom components
- TypeScript types
- CSS modules with tokens

### ✅ Claude Code Skill

Automatic enforcement of:
- No inline styles
- Design token usage
- Component patterns
- File organization

## Your First Steps

### 1. Create Your First Page

```bash
# Create a products listing page
touch src/app/products/page.tsx
```

```tsx
// src/app/products/page.tsx
import { ProductGrid } from '~features/products/components';

export default function ProductsPage() {
  return (
    <div className="container">
      <h1>Products</h1>
      <ProductGrid products={[]} />
    </div>
  );
}
```

### 2. Create Your First API Route

```bash
# Create products API route
mkdir -p src/app/api/products
touch src/app/api/products/route.ts
```

```tsx
// src/app/api/products/route.ts
import { NextResponse } from 'next/server';
import { getWooCommerceClient } from '~lib/woocommerce';

export async function GET() {
  try {
    const wc = getWooCommerceClient();
    const { data } = await wc.getProducts();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
```

### 3. Create Your First Feature

Let's create a "Cart" feature:

```bash
# Create directory structure
mkdir -p src/features/cart/{api,components,hooks,types}
```

**Types** (`src/features/cart/types/index.ts`):

```tsx
export interface CartItem {
  productId: number;
  quantity: number;
  price: number;
}
```

**Hook** (`src/features/cart/hooks/useCart.ts`):

```tsx
'use client';

import { useState } from 'react';
import type { CartItem } from '../types';

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: CartItem) => {
    setItems([...items, item]);
  };

  return { items, addItem };
};
```

**Component** (`src/features/cart/components/CartIcon.tsx`):

```tsx
'use client';

import React from 'react';
import { useCart } from '../hooks/useCart';
import styles from './CartIcon.module.css';

export const CartIcon: React.FC = () => {
  const { items } = useCart();

  return (
    <div className={styles.cartIcon}>
      🛒 {items.length}
    </div>
  );
};
```

**Styles** (`src/features/cart/components/CartIcon.module.css`):

```css
.cartIcon {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  background-color: var(--color-primary-600);
  color: white;
  border-radius: var(--border-radius-md);
  font-weight: var(--font-weight-medium);
}
```

## WooCommerce Setup

### Get Your API Credentials

1. Log into your WordPress/WooCommerce admin
2. Go to **WooCommerce → Settings → Advanced → REST API**
3. Click **Add Key**
4. Set permissions to **Read/Write**
5. Copy the Consumer Key and Secret

### Test Your Connection

```bash
# Add this temporary test route
# src/app/api/test-woo/route.ts
import { getWooCommerceClient } from '~lib/woocommerce';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const wc = getWooCommerceClient();
    const { data } = await wc.getProducts({ per_page: 5 });

    return NextResponse.json({
      success: true,
      productCount: data.length,
      products: data.map(p => ({ id: p.id, name: p.name }))
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

Visit http://localhost:3000/api/test-woo

## Stripe Setup

### Get Your API Keys

1. Sign up at https://stripe.com
2. Go to **Developers → API Keys**
3. Copy your Publishable Key and Secret Key
4. For webhooks, go to **Developers → Webhooks**

### Test Stripe Integration

```bash
# Create test payment intent route
# src/app/api/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import { createPaymentIntent } from '~lib/stripe/client';

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();

    const paymentIntent = await createPaymentIntent(amount);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
```

## Development Workflow

### Daily Commands

```bash
# Start dev server
npm run dev

# Type check
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

### Creating Components

1. **Check if foundational component exists first!**
2. Decide: `components/` (reusable) or `features/` (domain-specific)?
3. Create both `.tsx` and `.module.css` files
4. Use design tokens exclusively
5. Export via `index.ts`

### Component Template

```tsx
/**
 * ComponentName Component
 *
 * Description
 */

import React from 'react';
import type { ReactNode } from 'react';
import styles from './ComponentName.module.css';

export interface ComponentNameProps {
  children: ReactNode;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  children,
}) => {
  return (
    <div className={styles.container}>
      {children}
    </div>
  );
};

export default ComponentName;
```

### CSS Module Template

```css
/**
 * ComponentName Styles
 *
 * RULES:
 * - All values MUST use design tokens
 * - NO hardcoded values
 */

.container {
  display: flex;
  gap: var(--spacing-4);
  padding: var(--spacing-6);
  background-color: var(--color-background);
  border-radius: var(--border-radius-lg);
}
```

## Customization

### Change Brand Colors

Edit `src/styles/tokens.css`:

```css
:root {
  /* Change primary color */
  --color-primary-500: #your-color;
  --color-primary-600: #your-darker-color;
  --color-primary-700: #your-even-darker-color;
}
```

All components update automatically!

### Add New Spacing Values

```css
:root {
  --spacing-32: 8rem;  /* 128px */
}
```

### Extend Typography

```css
:root {
  --font-size-6xl: 4rem;  /* 64px */
}
```

## Troubleshooting

### WooCommerce Connection Issues

```bash
# Test your credentials
curl -u "ck_xxxxx:cs_xxxxx" \
  https://your-store.com/wp-json/wc/v3/products
```

### TypeScript Errors

```bash
# Clear and rebuild
rm -rf .next node_modules
npm install
npm run dev
```

### Module Not Found

Check your `tsconfig.json` paths match your imports:

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "~components/*": ["./src/components/*"]
  }
}
```

## Next Steps

1. ✅ Set up WooCommerce connection
2. ✅ Configure Stripe
3. ✅ Create your first feature
4. ✅ Build product listing page
5. ✅ Implement cart functionality
6. ✅ Create checkout flow
7. ✅ Add authentication
8. ✅ Deploy to production

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Build for Production

```bash
npm run build
npm start
```

## Support

- **Next.js Docs**: https://nextjs.org/docs
- **WooCommerce API**: https://woocommerce.github.io/woocommerce-rest-api-docs/
- **Stripe Docs**: https://stripe.com/docs
- **Claude Code**: https://docs.claude.com/claude-code

## Remember

✅ No inline styles
✅ Use design tokens
✅ Follow component patterns
✅ TypeScript everything
✅ Test on mobile
✅ Check accessibility

**You're all set! Happy coding! 🚀**
