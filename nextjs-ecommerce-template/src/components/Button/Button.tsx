/**
 * Button Component
 *
 * A reusable button component following DRY and SRP principles.
 * All styling uses design tokens from Button.module.css
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 */

import React, { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';
import type { ButtonVariant, ButtonSize } from '@/styles/tokens';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant for different visual styles */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Loading state - shows spinner */
  loading?: boolean;
  /** Button content */
  children: ReactNode;
  /** Optional icon before text */
  iconBefore?: ReactNode;
  /** Optional icon after text */
  iconAfter?: ReactNode;
  /** Whether the button contains only an icon (adjusts padding) */
  iconOnly?: boolean;
}

/**
 * Button Component
 *
 * Follows design token system for consistent UX.
 * NO inline styles - all styling via Button.module.css
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      children,
      iconBefore,
      iconAfter,
      iconOnly = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const buttonClasses = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      loading && styles.loading,
      iconOnly && styles.iconOnly,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        {...props}
      >
        {iconBefore && <span className={styles.icon}>{iconBefore}</span>}
        {children}
        {iconAfter && <span className={styles.icon}>{iconAfter}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
