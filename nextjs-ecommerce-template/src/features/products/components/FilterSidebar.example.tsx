/**
 * FilterSidebar Usage Example
 *
 * This file demonstrates how to use the FilterSidebar component
 * in a shop/products page.
 */

'use client';

import React, { useState } from 'react';
import { FilterSidebar } from './FilterSidebar';
import { ProductGrid } from './ProductGrid';
import type { FilterGroup, ActiveFilters } from '../types/filters';
import type { Product } from '../types';

/**
 * Example Shop Page with FilterSidebar
 */
export const ShopPageExample: React.FC = () => {
  // Mock filter groups configuration
  const filterGroups: FilterGroup[] = [
    {
      id: 'category',
      label: 'Categories',
      type: 'checkbox',
      expanded: true,
      options: [
        { id: 'electronics', label: 'Electronics', count: 45 },
        { id: 'clothing', label: 'Clothing', count: 120 },
        { id: 'books', label: 'Books', count: 67 },
        { id: 'home', label: 'Home & Garden', count: 89 },
      ],
    },
    {
      id: 'color',
      label: 'Color',
      type: 'checkbox',
      expanded: true,
      options: [
        { id: 'red', label: 'Red', count: 23 },
        { id: 'blue', label: 'Blue', count: 34 },
        { id: 'black', label: 'Black', count: 56 },
        { id: 'white', label: 'White', count: 41 },
      ],
    },
    {
      id: 'size',
      label: 'Size',
      type: 'checkbox',
      expanded: false,
      options: [
        { id: 'xs', label: 'Extra Small', count: 12 },
        { id: 's', label: 'Small', count: 28 },
        { id: 'm', label: 'Medium', count: 45 },
        { id: 'l', label: 'Large', count: 34 },
        { id: 'xl', label: 'Extra Large', count: 19 },
      ],
    },
    {
      id: 'brand',
      label: 'Brand',
      type: 'checkbox',
      expanded: false,
      options: [
        { id: 'nike', label: 'Nike', count: 67 },
        { id: 'adidas', label: 'Adidas', count: 54 },
        { id: 'puma', label: 'Puma', count: 32 },
        { id: 'reebok', label: 'Reebok', count: 21 },
      ],
    },
  ];

  // State for active filters
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  // Mock products (in real app, these would be filtered based on activeFilters)
  const [products] = useState<Product[]>([]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = (filters: ActiveFilters) => {
    setActiveFilters(filters);

    // In a real app, you would:
    // 1. Update URL params
    // 2. Fetch filtered products from API
    // 3. Update product list
    console.log('Filters changed:', filters);
  };

  /**
   * Clear all filters
   */
  const handleClearAll = () => {
    setActiveFilters({});
    // In a real app, also reset product list and URL
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-6)', padding: 'var(--spacing-6)' }}>
      {/* Sidebar */}
      <div style={{ width: '300px', flexShrink: 0 }}>
        <FilterSidebar
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAll}
          priceRange={{
            min: 0,
            max: 1000,
            step: 10,
          }}
        />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <h1>Shop Products</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {products.length} products found
          </p>
        </div>

        <ProductGrid
          products={products}
          loading={false}
          emptyMessage="No products match your filters. Try adjusting your criteria."
        />
      </div>
    </div>
  );
};

export default ShopPageExample;
