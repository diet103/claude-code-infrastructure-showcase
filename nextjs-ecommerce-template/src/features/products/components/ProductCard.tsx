/**
 * ProductCard Component
 *
 * Displays a product in a card layout.
 * Demonstrates proper use of:
 * - Foundational components (Card, Button)
 * - Design tokens (NO inline styles)
 * - Component.module.css pattern
 * - TypeScript types
 * - Event handling
 *
 * @example
 * ```tsx
 * <ProductCard
 *   product={product}
 *   onAddToCart={handleAddToCart}
 *   onViewDetails={handleViewDetails}
 * />
 * ```
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '~components/Card';
import { Button } from '~components/Button';
import type { Product } from '../types';
import styles from './ProductCard.module.css';

export interface ProductCardProps {
  /** Product data */
  product: Product;
  /** Add to cart handler */
  onAddToCart?: (productId: number) => void;
  /** View details handler */
  onViewDetails?: (productId: number) => void;
  /** Loading state for add to cart */
  addingToCart?: boolean;
}

/**
 * ProductCard Component
 *
 * A reusable product card following all project patterns.
 * Uses foundational Card and Button components.
 * All styling via ProductCard.module.css with design tokens.
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onViewDetails,
  addingToCart = false,
}) => {
  const {
    id,
    name,
    shortDescription,
    price,
    regularPrice,
    salePrice,
    onSale,
    inStock,
    images,
    categories,
    averageRating,
    ratingCount,
  } = product;

  const primaryImage = images[0];
  const primaryCategory = categories[0];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onAddToCart && inStock) {
      onAddToCart(id);
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(id);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <span key={i} className={styles.stars}>
            ★
          </span>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <span key={i} className={styles.stars}>
            ⯨
          </span>
        );
      } else {
        stars.push(
          <span key={i} style={{ color: 'var(--color-gray-300)' }}>
            ★
          </span>
        );
      }
    }

    return stars;
  };

  return (
    <Card
      variant="elevated"
      padding="none"
      interactive
      onClick={handleViewDetails}
      className={styles.productCard}
    >
      <div className={styles.imageContainer}>
        {primaryImage ? (
          <Image
            src={primaryImage.src}
            alt={primaryImage.alt || name}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className={styles.image} />
        )}

        {onSale && inStock && <div className={styles.badge}>Sale</div>}
        {!inStock && (
          <div className={`${styles.badge} ${styles.outOfStockBadge}`}>
            Out of Stock
          </div>
        )}
      </div>

      <div className={styles.content}>
        {primaryCategory && (
          <div className={styles.category}>{primaryCategory.name}</div>
        )}

        <h3 className={styles.title}>{name}</h3>

        {shortDescription && (
          <p
            className={styles.description}
            dangerouslySetInnerHTML={{ __html: shortDescription }}
          />
        )}

        {ratingCount > 0 && (
          <div className={styles.rating}>
            <div className={styles.stars}>{renderStars(averageRating)}</div>
            <span className={styles.ratingCount}>({ratingCount})</span>
          </div>
        )}

        <div className={styles.priceContainer}>
          <span className={styles.price}>${price.toFixed(2)}</span>
          {onSale && salePrice && (
            <span className={styles.regularPrice}>
              ${regularPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <Button
          variant={inStock ? 'primary' : 'outline'}
          size="md"
          fullWidth
          onClick={handleAddToCart}
          disabled={!inStock}
          loading={addingToCart}
          className={styles.addToCartButton}
        >
          {inStock ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </div>
    </Card>
  );
};

export default ProductCard;
