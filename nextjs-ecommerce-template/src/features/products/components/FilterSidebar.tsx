/**
 * FilterSidebar Component
 *
 * A comprehensive filter sidebar for product filtering with:
 * - Category filters
 * - Price range slider
 * - Attribute filters (color, size, etc.)
 * - Active filter display
 * - Expandable/collapsible sections
 *
 * @example
 * ```tsx
 * <FilterSidebar
 *   filterGroups={filterGroups}
 *   activeFilters={activeFilters}
 *   onFilterChange={handleFilterChange}
 * />
 * ```
 */

'use client';

import React, { useState, useCallback } from 'react';
import type { FilterGroup, ActiveFilters, PriceRange } from '../types/filters';
import styles from './FilterSidebar.module.css';

export interface FilterSidebarProps {
  /** Filter group configurations */
  filterGroups: FilterGroup[];
  /** Currently active filters */
  activeFilters?: ActiveFilters;
  /** Callback when filters change */
  onFilterChange?: (filters: ActiveFilters) => void;
  /** Callback to clear all filters */
  onClearAll?: () => void;
  /** Price range configuration */
  priceRange?: {
    min: number;
    max: number;
    step?: number;
  };
}

/**
 * FilterSidebar Component
 *
 * Provides comprehensive filtering UI for product listings.
 * All styling via FilterSidebar.module.css with design tokens.
 */
export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filterGroups,
  activeFilters = {},
  onFilterChange,
  onClearAll,
  priceRange = { min: 0, max: 1000, step: 10 },
}) => {
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(filterGroups.filter((g) => g.expanded).map((g) => g.id))
  );

  // Local price range state
  const [localPriceRange, setLocalPriceRange] = useState<PriceRange>(
    activeFilters.priceRange || { min: priceRange.min, max: priceRange.max }
  );

  /**
   * Toggle group expansion
   */
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  /**
   * Handle checkbox filter change
   */
  const handleCheckboxChange = useCallback(
    (groupId: string, optionId: string, checked: boolean) => {
      if (!onFilterChange) return;

      const updatedFilters = { ...activeFilters };

      // Initialize array if doesn't exist
      if (!updatedFilters.attributes) {
        updatedFilters.attributes = {};
      }
      if (!updatedFilters.attributes[groupId]) {
        updatedFilters.attributes[groupId] = [];
      }

      // Add or remove option
      if (checked) {
        if (!updatedFilters.attributes[groupId].includes(optionId)) {
          updatedFilters.attributes[groupId] = [
            ...updatedFilters.attributes[groupId],
            optionId,
          ];
        }
      } else {
        updatedFilters.attributes[groupId] = updatedFilters.attributes[
          groupId
        ].filter((id) => id !== optionId);

        // Clean up empty arrays
        if (updatedFilters.attributes[groupId].length === 0) {
          delete updatedFilters.attributes[groupId];
        }
      }

      onFilterChange(updatedFilters);
    },
    [activeFilters, onFilterChange]
  );

  /**
   * Handle price range change
   */
  const handlePriceRangeChange = useCallback(
    (type: 'min' | 'max', value: number) => {
      const newRange = {
        ...localPriceRange,
        [type]: value,
      };

      setLocalPriceRange(newRange);

      // Only trigger filter change if valid range
      if (newRange.min <= newRange.max) {
        onFilterChange?.({
          ...activeFilters,
          priceRange: newRange,
        });
      }
    },
    [localPriceRange, activeFilters, onFilterChange]
  );

  /**
   * Remove a specific active filter
   */
  const handleRemoveFilter = useCallback(
    (groupId: string, optionId?: string) => {
      if (!onFilterChange) return;

      const updatedFilters = { ...activeFilters };

      if (groupId === 'price') {
        delete updatedFilters.priceRange;
        setLocalPriceRange({ min: priceRange.min, max: priceRange.max });
      } else if (updatedFilters.attributes?.[groupId]) {
        if (optionId) {
          updatedFilters.attributes[groupId] = updatedFilters.attributes[
            groupId
          ].filter((id) => id !== optionId);

          if (updatedFilters.attributes[groupId].length === 0) {
            delete updatedFilters.attributes[groupId];
          }
        } else {
          delete updatedFilters.attributes[groupId];
        }
      }

      onFilterChange(updatedFilters);
    },
    [activeFilters, onFilterChange, priceRange]
  );

  /**
   * Check if an option is currently active
   */
  const isOptionActive = (groupId: string, optionId: string): boolean => {
    return activeFilters.attributes?.[groupId]?.includes(optionId) || false;
  };

  /**
   * Get active filter tags for display
   */
  const getActiveFilterTags = (): Array<{
    groupId: string;
    optionId?: string;
    label: string;
  }> => {
    const tags: Array<{ groupId: string; optionId?: string; label: string }> =
      [];

    // Price range
    if (
      activeFilters.priceRange &&
      (activeFilters.priceRange.min !== priceRange.min ||
        activeFilters.priceRange.max !== priceRange.max)
    ) {
      tags.push({
        groupId: 'price',
        label: `$${activeFilters.priceRange.min} - $${activeFilters.priceRange.max}`,
      });
    }

    // Attribute filters
    if (activeFilters.attributes) {
      Object.entries(activeFilters.attributes).forEach(([groupId, options]) => {
        const group = filterGroups.find((g) => g.id === groupId);
        if (!group) return;

        options.forEach((optionId) => {
          const option = group.options.find((o) => o.id === optionId);
          if (option) {
            tags.push({
              groupId,
              optionId,
              label: option.label,
            });
          }
        });
      });
    }

    return tags;
  };

  const activeFilterTags = getActiveFilterTags();
  const hasActiveFilters = activeFilterTags.length > 0;

  return (
    <aside className={styles.sidebar}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Filters</h2>
        {hasActiveFilters && onClearAll && (
          <button
            className={styles.clearButton}
            onClick={onClearAll}
            type="button"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className={styles.activeFilters}>
          <h3 className={styles.activeFiltersTitle}>Active Filters</h3>
          <div className={styles.activeFiltersList}>
            {activeFilterTags.map((tag, index) => (
              <div key={`${tag.groupId}-${tag.optionId || 'range'}-${index}`} className={styles.activeFilterTag}>
                <span>{tag.label}</span>
                <button
                  className={styles.removeFilter}
                  onClick={() =>
                    handleRemoveFilter(tag.groupId, tag.optionId)
                  }
                  aria-label={`Remove ${tag.label} filter`}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div className={styles.filterGroup}>
        <div
          className={styles.groupHeader}
          onClick={() => toggleGroup('price')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              toggleGroup('price');
            }
          }}
        >
          <h3 className={styles.groupTitle}>Price Range</h3>
          <span
            className={`${styles.expandIcon} ${
              expandedGroups.has('price') ? styles.expanded : ''
            }`}
          >
            ▼
          </span>
        </div>

        <div
          className={`${styles.groupContent} ${
            !expandedGroups.has('price') ? styles.collapsed : ''
          }`}
        >
          <div className={styles.priceRange}>
            <div className={styles.priceInputs}>
              <input
                type="number"
                className={styles.priceInput}
                value={localPriceRange.min}
                min={priceRange.min}
                max={priceRange.max}
                step={priceRange.step}
                onChange={(e) =>
                  handlePriceRangeChange('min', Number(e.target.value))
                }
                aria-label="Minimum price"
              />
              <span className={styles.priceSeparator}>to</span>
              <input
                type="number"
                className={styles.priceInput}
                value={localPriceRange.max}
                min={priceRange.min}
                max={priceRange.max}
                step={priceRange.step}
                onChange={(e) =>
                  handlePriceRangeChange('max', Number(e.target.value))
                }
                aria-label="Maximum price"
              />
            </div>

            <input
              type="range"
              className={styles.slider}
              min={priceRange.min}
              max={priceRange.max}
              step={priceRange.step}
              value={localPriceRange.max}
              onChange={(e) =>
                handlePriceRangeChange('max', Number(e.target.value))
              }
              aria-label="Price range slider"
            />
          </div>
        </div>
      </div>

      <hr className={styles.divider} />

      {/* Filter Groups */}
      {filterGroups.map((group) => (
        <div key={group.id} className={styles.filterGroup}>
          <div
            className={styles.groupHeader}
            onClick={() => toggleGroup(group.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                toggleGroup(group.id);
              }
            }}
          >
            <h3 className={styles.groupTitle}>{group.label}</h3>
            <span
              className={`${styles.expandIcon} ${
                expandedGroups.has(group.id) ? styles.expanded : ''
              }`}
            >
              ▼
            </span>
          </div>

          <div
            className={`${styles.groupContent} ${
              !expandedGroups.has(group.id) ? styles.collapsed : ''
            }`}
          >
            {group.options.map((option) => {
              const isActive = isOptionActive(group.id, option.id);

              return (
                <label key={option.id} className={styles.option}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isActive}
                    onChange={(e) =>
                      handleCheckboxChange(
                        group.id,
                        option.id,
                        e.target.checked
                      )
                    }
                    aria-label={option.label}
                  />
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.count !== undefined && (
                    <span className={styles.optionCount}>({option.count})</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
};

export default FilterSidebar;
