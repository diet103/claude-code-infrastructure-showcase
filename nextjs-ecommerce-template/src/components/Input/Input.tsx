/**
 * Input Component
 *
 * A reusable input field component with support for labels, validation,
 * helper text, and icons.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 *   error="Please enter a valid email"
 *   required
 * />
 * ```
 */

import React, { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.css';
import type { InputSize } from '@/styles/tokens';

interface BaseInputProps {
  /** Input label */
  label?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message - when present, input shows error state */
  error?: string;
  /** Size variant */
  size?: InputSize;
  /** Icon before input */
  iconBefore?: ReactNode;
  /** Icon after input */
  iconAfter?: ReactNode;
  /** Whether the input should take full width */
  fullWidth?: boolean;
  /** Whether to render as textarea */
  multiline?: boolean;
}

export type InputProps = BaseInputProps &
  (
    | ({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
    | ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>)
  );

/**
 * Input Component
 *
 * Versatile input component supporting text, email, password, number, etc.
 * Can also render as textarea when multiline=true
 */
export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>((props, ref) => {
  const {
    label,
    required = false,
    helperText,
    error,
    size = 'md',
    iconBefore,
    iconAfter,
    fullWidth = true,
    multiline = false,
    className,
    disabled,
    ...inputProps
  } = props;

  const inputClasses = [
    styles.input,
    styles[size],
    error && styles.error,
    !error && inputProps.value && styles.success,
    iconBefore && styles.withIconBefore,
    iconAfter && styles.withIconAfter,
    multiline && styles.textarea,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const wrapperClasses = [
    styles.inputWrapper,
    fullWidth && styles.fullWidth,
  ]
    .filter(Boolean)
    .join(' ');

  const renderInput = () => {
    if (multiline) {
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={inputClasses}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputProps.id}-error` : helperText ? `${inputProps.id}-helper` : undefined
          }
          {...(inputProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      );
    }

    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        className={inputClasses}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${inputProps.id}-error` : helperText ? `${inputProps.id}-helper` : undefined
        }
        {...(inputProps as InputHTMLAttributes<HTMLInputElement>)}
      />
    );
  };

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={inputProps.id} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <div className={styles.inputContainer}>
        {iconBefore && <span className={styles.iconBefore}>{iconBefore}</span>}
        {renderInput()}
        {iconAfter && <span className={styles.iconAfter}>{iconAfter}</span>}
      </div>

      {error && (
        <span className={styles.errorText} id={`${inputProps.id}-error`}>
          {error}
        </span>
      )}

      {!error && helperText && (
        <span className={styles.helperText} id={`${inputProps.id}-helper`}>
          {helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
