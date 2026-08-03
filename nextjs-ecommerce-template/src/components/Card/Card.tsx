/**
 * Card Component
 *
 * A versatile card container for content grouping.
 * Perfect for product cards, info boxes, dashboard widgets, etc.
 *
 * @example
 * ```tsx
 * <Card variant="elevated" padding="md">
 *   <CardHeader>Product Name</CardHeader>
 *   <CardBody>Product description goes here</CardBody>
 *   <CardFooter>$99.99</CardFooter>
 * </Card>
 * ```
 */

import React from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card visual variant */
  variant?: 'elevated' | 'outlined' | 'flat';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Whether the card is interactive (hover effects) */
  interactive?: boolean;
  /** Card content */
  children: ReactNode;
}

/**
 * Card Component
 *
 * Main container component. Use with CardHeader, CardBody, CardFooter
 * for structured layouts, or use standalone for simple content wrapping.
 */
export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  padding = 'md',
  interactive = false,
  children,
  className,
  onClick,
  ...props
}) => {
  const cardClasses = [
    styles.card,
    variant && styles[variant],
    padding === 'sm' && styles.paddingSm,
    padding === 'md' && styles.padding,
    padding === 'lg' && styles.paddingLg,
    padding === 'none' && styles.paddingNone,
    interactive && styles.interactive,
    onClick && styles.clickable,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

/**
 * CardHeader Component
 *
 * Header section of a card, typically for titles or actions.
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className,
  ...props
}) => {
  const headerClasses = [styles.header, className].filter(Boolean).join(' ');

  return (
    <div className={headerClasses} {...props}>
      {children}
    </div>
  );
};

/**
 * CardBody Component
 *
 * Main content area of a card.
 */
export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className,
  ...props
}) => {
  const bodyClasses = [styles.body, className].filter(Boolean).join(' ');

  return (
    <div className={bodyClasses} {...props}>
      {children}
    </div>
  );
};

/**
 * CardFooter Component
 *
 * Footer section of a card, typically for actions or metadata.
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  ...props
}) => {
  const footerClasses = [styles.footer, className].filter(Boolean).join(' ');

  return (
    <div className={footerClasses} {...props}>
      {children}
    </div>
  );
};

export default Card;
