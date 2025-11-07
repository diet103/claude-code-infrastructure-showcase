/**
 * Table Component
 *
 * A responsive, accessible table component with sorting, striping, and hover effects.
 *
 * @example
 * ```tsx
 * <Table
 *   columns={[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'price', label: 'Price', align: 'right' },
 *   ]}
 *   data={products}
 *   striped
 *   hoverable
 * />
 * ```
 */

import React from 'react';
import type { ReactNode } from 'react';
import styles from './Table.module.css';

export interface TableColumn<T = any> {
  /** Unique key for the column */
  key: string;
  /** Display label */
  label: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom render function */
  render?: (value: any, row: T, index: number) => ReactNode;
}

export interface TableProps<T = any> {
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Table data */
  data: T[];
  /** Whether rows should have hover effect */
  hoverable?: boolean;
  /** Whether rows are clickable */
  clickable?: boolean;
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Whether to stripe rows */
  striped?: boolean;
  /** Compact spacing */
  compact?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Sort configuration */
  sortConfig?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  /** Sort change handler */
  onSortChange?: (key: string) => void;
}

/**
 * Table Component
 *
 * Generic table component with flexible column configuration.
 */
export function Table<T extends Record<string, any>>({
  columns,
  data,
  hoverable = false,
  clickable = false,
  onRowClick,
  striped = false,
  compact = false,
  loading = false,
  emptyMessage = 'No data available',
  sortConfig,
  onSortChange,
}: TableProps<T>) {
  const tableClasses = [
    styles.table,
    striped && styles.striped,
    compact && styles.compact,
  ]
    .filter(Boolean)
    .join(' ');

  const handleSort = (columnKey: string) => {
    if (onSortChange) {
      onSortChange(columnKey);
    }
  };

  const renderSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return (
        <span className={styles.sortIcon}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 3L8 5H4L6 3Z" />
            <path d="M6 9L4 7H8L6 9Z" />
          </svg>
        </span>
      );
    }

    return (
      <span className={styles.sortIcon}>
        {sortConfig.direction === 'asc' ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 3L8 5H4L6 3Z" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 9L4 7H8L6 9Z" />
          </svg>
        )}
      </span>
    );
  };

  const getCellValue = (row: T, column: TableColumn<T>, index: number) => {
    const value = row[column.key];

    if (column.render) {
      return column.render(value, row, index);
    }

    return value;
  };

  if (loading) {
    return (
      <div className={styles.tableWrapper}>
        <table className={tableClasses}>
          <thead className={styles.thead}>
            <tr className={styles.tr}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${styles.th} ${styles[`align${column.align?.charAt(0).toUpperCase()}${column.align?.slice(1)}` as keyof typeof styles] || styles.alignLeft}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className={styles.loadingState}>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={styles.tableWrapper}>
        <table className={tableClasses}>
          <thead className={styles.thead}>
            <tr className={styles.tr}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${styles.th} ${styles[`align${column.align?.charAt(0).toUpperCase()}${column.align?.slice(1)}` as keyof typeof styles] || styles.alignLeft}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className={styles.emptyState}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={tableClasses}>
        <thead className={styles.thead}>
          <tr className={styles.tr}>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`${styles.th} ${
                  column.sortable ? styles.sortable : ''
                } ${styles[`align${column.align?.charAt(0).toUpperCase()}${column.align?.slice(1)}` as keyof typeof styles] || styles.alignLeft}`}
                onClick={
                  column.sortable ? () => handleSort(column.key) : undefined
                }
              >
                {column.label}
                {column.sortable && renderSortIcon(column.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {data.map((row, rowIndex) => {
            const rowClasses = [
              styles.tr,
              hoverable && styles.hoverable,
              clickable && styles.clickable,
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <tr
                key={rowIndex}
                className={rowClasses}
                onClick={
                  clickable && onRowClick
                    ? () => onRowClick(row, rowIndex)
                    : undefined
                }
              >
                {columns.map((column) => {
                  const alignClass =
                    styles[
                      `align${column.align?.charAt(0).toUpperCase()}${column.align?.slice(1)}` as keyof typeof styles
                    ] || styles.alignLeft;

                  return (
                    <td key={column.key} className={`${styles.td} ${alignClass}`}>
                      {getCellValue(row, column, rowIndex)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
