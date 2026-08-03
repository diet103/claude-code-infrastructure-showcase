---
name: nextjs-ecommerce-guidelines
version: 1.0.0
description: Development guidelines for Next.js + WooCommerce eCommerce applications
type: guardrail
enforcement: block
---

# Next.js eCommerce Development Guidelines

**PURPOSE**: Enforce consistent patterns, DRY principles, SRP, design token usage, and Component.module.css styling across the Next.js + WooCommerce eCommerce application.

## Core Principles

### 1. DRY (Don't Repeat Yourself)
- Reuse foundational components (Button, Card, Input, Form, Table, Modal)
- Extract repeated logic into custom hooks
- Create utility functions for common operations
- Use TypeScript generics for type reusability

### 2. SRP (Single Responsibility Principle)
- Each component has ONE clear purpose
- Features directory for domain-specific logic
- Components directory for truly reusable UI elements
- Separation of concerns: UI, business logic, data fetching

### 3. NO Inline Styles
**CRITICAL RULE**: NO hardcoded colors, spacing, or design values in components.

❌ **FORBIDDEN**:
```tsx
<div style={{ color: '#2196f3', padding: '16px' }}>
```

✅ **REQUIRED**:
```tsx
<div className={styles.container}>
```

```css
/* Component.module.css */
.container {
  color: var(--color-primary-600);
  padding: var(--spacing-4);
}
```

### 4. Design Tokens Only
ALL styling values MUST come from design tokens defined in `src/styles/tokens.css`.

**Available token categories**:
- Colors: `--color-primary-500`, `--color-text-primary`, etc.
- Spacing: `--spacing-4`, `--spacing-6`, etc.
- Typography: `--font-size-base`, `--font-weight-medium`, etc.
- Borders: `--border-radius-md`, `--border-width-thin`, etc.
- Shadows: `--shadow-md`, `--shadow-lg`, etc.
- Transitions: `--transition-base`, etc.

## File Organization

### Project Structure

```
src/
  app/                    # Next.js App Router pages
    page.tsx
    layout.tsx
    products/
      page.tsx
      [id]/page.tsx

  components/             # Reusable UI components
    Button/
      Button.tsx
      Button.module.css
      index.ts
    Card/
    Input/
    Modal/
    Form/
    Table/

  features/               # Domain-specific features
    products/
      api/                # API service layer
        productsApi.ts
      components/         # Feature-specific components
        ProductCard.tsx
        ProductCard.module.css
        ProductGrid.tsx
      hooks/              # Custom hooks
        useProducts.ts
      types/              # TypeScript types
        index.ts

  lib/                    # Shared libraries
    woocommerce/
      client.ts
      types.ts
    stripe/
      client.ts
    utils/

  hooks/                  # App-level hooks
    useCart.ts

  types/                  # Global types

  styles/                 # Global styles & tokens
    tokens.css
    globals.css
    tokens.ts
```

### When to use features/ vs components/

**Use `features/` when**:
- Component is specific to a business domain (products, orders, customers)
- Tightly coupled to specific data structures
- Contains business logic
- Used in specific contexts

**Use `components/` when**:
- Component is truly reusable across the app
- No business logic
- Pure UI component
- Used in 3+ different places

## Component Patterns

### Component Structure

Every component MUST follow this pattern:

```tsx
/**
 * ComponentName Component
 *
 * Clear description of what this component does.
 *
 * @example
 * ```tsx
 * <ComponentName prop1="value" onAction={handler} />
 * ```
 */

'use client'; // Only if using client features

import React from 'react';
import type { ReactNode } from 'react';
import styles from './ComponentName.module.css';

export interface ComponentNameProps {
  /** Prop description */
  prop1: string;
  /** Optional prop */
  prop2?: number;
  /** Event handler */
  onAction?: () => void;
  children?: ReactNode;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2 = 0,
  onAction,
  children,
}) => {
  // Component logic here

  return (
    <div className={styles.container}>
      {children}
    </div>
  );
};

export default ComponentName;
```

### CSS Module Structure

Every `Component.module.css` MUST follow this pattern:

```css
/**
 * ComponentName Component Styles
 *
 * RULES:
 * - All values MUST use design tokens from tokens.css
 * - NO hardcoded colors, spacing, or other values
 * - Maintain consistent UX across all instances
 */

.container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-6);
  background-color: var(--color-background);
  border-radius: var(--border-radius-lg);
}

.title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: var(--spacing-4);
  }
}
```

## TypeScript Standards

### Type Definitions

```tsx
// ✅ GOOD: Explicit prop types with JSDoc
export interface ButtonProps {
  /** Button visual variant */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Click handler */
  onClick?: () => void;
  children: ReactNode;
}

// ❌ BAD: No documentation
interface Props {
  variant?: string;
  size?: string;
  onClick?: any;
}
```

### Path Aliases

Use configured path aliases for imports:

```tsx
// ✅ GOOD
import { Button } from '~components/Button';
import { Product } from '~features/products/types';
import { formatPrice } from '~lib/utils';

// ❌ BAD
import { Button } from '../../../components/Button';
```

## Data Fetching Patterns

### API Routes (Server-Side)

```tsx
// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { getWooCommerceClient } from '~lib/woocommerce';

export async function GET(request: Request) {
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

### Client-Side Service Layer

```tsx
// features/products/api/productsApi.ts
export const getProducts = async (): Promise<Product[]> => {
  const response = await fetch('/api/products');

  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }

  return response.json();
};
```

### Custom Hooks

```tsx
// features/products/hooks/useProducts.ts
'use client';

import { useState, useEffect } from 'react';
import { getProducts } from '../api/productsApi';
import type { Product } from '../types';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading, error };
};
```

## Form Handling

Use the Form foundational component:

```tsx
<Form onSubmit={handleSubmit} error={formError}>
  <FormGroup>
    <Input
      label="Email"
      type="email"
      required
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />
    <Input
      label="Password"
      type="password"
      required
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
  </FormGroup>

  <FormActions>
    <Button type="button" variant="outline" onClick={onCancel}>
      Cancel
    </Button>
    <Button type="submit" loading={isSubmitting}>
      Submit
    </Button>
  </FormActions>
</Form>
```

## WooCommerce Integration

### Server-Side Only

WooCommerce API credentials MUST never be exposed to the client:

```tsx
// ✅ GOOD: API Route (server-side)
import { getWooCommerceClient } from '~lib/woocommerce';

export async function GET() {
  const wc = getWooCommerceClient();
  const products = await wc.getProducts();
  return NextResponse.json(products);
}

// ❌ BAD: Client component
'use client';
const wc = getWooCommerceClient(); // This will throw error!
```

### Type Mapping

Map WooCommerce types to simplified frontend types:

```tsx
// lib/woocommerce/mappers.ts
export const mapWooProductToProduct = (
  wooProduct: WooCommerceProduct
): Product => ({
  id: wooProduct.id,
  name: wooProduct.name,
  price: parseFloat(wooProduct.price),
  regularPrice: parseFloat(wooProduct.regular_price),
  salePrice: wooProduct.sale_price ? parseFloat(wooProduct.sale_price) : null,
  // ... map other fields
});
```

## Error Handling

Always handle errors gracefully:

```tsx
try {
  const data = await fetchData();
  setData(data);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  setError(message);
  console.error('Failed to fetch data:', error);
}
```

## Performance

### Image Optimization

Always use Next.js Image component:

```tsx
import Image from 'next/image';

<Image
  src={product.image}
  alt={product.name}
  width={300}
  height={300}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### Code Splitting

Use dynamic imports for heavy components:

```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
});
```

## Accessibility

- Use semantic HTML
- Provide alt text for images
- Ensure keyboard navigation works
- Use ARIA labels where needed
- Test with screen readers

## Testing Checklist

Before committing:

✅ No inline styles
✅ All design tokens used correctly
✅ TypeScript types defined
✅ Components follow structure pattern
✅ CSS modules use tokens only
✅ No WooCommerce/Stripe keys on client
✅ Error handling in place
✅ Responsive design tested
✅ Accessibility checked

## Common Mistakes to Avoid

1. ❌ Hardcoded colors/spacing
2. ❌ Inline styles
3. ❌ Exposing API credentials to client
4. ❌ Missing TypeScript types
5. ❌ Not using foundational components
6. ❌ Mixing business logic in UI components
7. ❌ Not using path aliases
8. ❌ Missing error handling
9. ❌ No responsive design
10. ❌ Poor accessibility

---

**Remember**: Consistency is key. Follow these patterns strictly to maintain a clean, maintainable codebase.

For more detailed information, see the resources/ directory.
