/**
 * Form Component
 *
 * A wrapper component for forms with consistent structure and styling.
 * Use with FormGroup, FormRow, and FormActions for structured layouts.
 *
 * @example
 * ```tsx
 * <Form onSubmit={handleSubmit} error={error}>
 *   <FormGroup>
 *     <Input label="Email" type="email" required />
 *     <Input label="Password" type="password" required />
 *   </FormGroup>
 *   <FormActions>
 *     <Button type="submit" loading={isSubmitting}>Submit</Button>
 *   </FormActions>
 * </Form>
 * ```
 */

import React from 'react';
import type { FormHTMLAttributes, ReactNode } from 'react';
import styles from './Form.module.css';

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  /** Form content */
  children: ReactNode;
  /** Error message to display at top of form */
  error?: string;
  /** Success message to display at top of form */
  success?: string;
}

/**
 * Form Component
 *
 * Wrapper for form elements with error/success message handling.
 */
export const Form: React.FC<FormProps> = ({
  children,
  error,
  success,
  className,
  onSubmit,
  ...props
}) => {
  const formClasses = [styles.form, className].filter(Boolean).join(' ');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form className={formClasses} onSubmit={handleSubmit} {...props}>
      {error && <div className={styles.formError}>{error}</div>}
      {success && <div className={styles.formSuccess}>{success}</div>}
      {children}
    </form>
  );
};

/**
 * FormGroup Component
 *
 * Groups form fields vertically with consistent spacing.
 */
export interface FormGroupProps {
  children: ReactNode;
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  className,
}) => {
  const groupClasses = [styles.formGroup, className].filter(Boolean).join(' ');
  return <div className={groupClasses}>{children}</div>;
};

/**
 * FormRow Component
 *
 * Arranges form fields horizontally in a responsive grid.
 */
export interface FormRowProps {
  children: ReactNode;
  className?: string;
}

export const FormRow: React.FC<FormRowProps> = ({ children, className }) => {
  const rowClasses = [styles.formRow, className].filter(Boolean).join(' ');
  return <div className={rowClasses}>{children}</div>;
};

/**
 * FormActions Component
 *
 * Container for form action buttons with consistent layout.
 */
export interface FormActionsProps {
  children: ReactNode;
  className?: string;
  /** Alignment of action buttons */
  align?: 'left' | 'center' | 'right' | 'spaceBetween';
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  className,
  align = 'right',
}) => {
  const actionsClasses = [
    styles.formActions,
    align === 'left' && styles.alignLeft,
    align === 'center' && styles.alignCenter,
    align === 'spaceBetween' && styles.spaceBetween,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={actionsClasses}>{children}</div>;
};

export default Form;
