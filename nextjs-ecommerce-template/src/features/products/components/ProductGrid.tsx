/**
 * ProductGrid Component
 *
 * Displays a responsive grid of product cards.
 * Handles loading and empty states.
 *
 * @example
 * ```tsx
 * <ProductGrid
 *   products={products}
 *   loading={isLoading}
 *   onAddToCart={handleAddToCart}
 *   onViewProduct={handleViewProduct}
 * />
 * ```
 */

'use client';

import React from 'react';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';
import styles from './ProductGrid.module.css';

export interface ProductGridProps {
  /** Array of products to display */
  products: Product[];
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Add to cart handler */
  onAddToCart?: (productId: number) => void;
  /** View product details handler */
  onViewProduct?: (productId: number) => void;
  /** Product ID currently being added to cart */
  addingToCartId?: number | null;
}

/**
 * ProductGrid Component
 *
 * Container for displaying multiple ProductCard components in a responsive grid.
 */
export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  emptyMessage = 'No products found',
  onAddToCart,
  onViewProduct,
  addingToCartId = null,
}) => {
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="loading-spinner">Loading products...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📦</div>
        <h3 className={styles.emptyTitle}>No Products Found</h3>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          onViewDetails={onViewProduct}
          addingToCart={addingToCartId === product.id}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
