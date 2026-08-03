/**
 * FilterSidebar Component Types
 */

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'checkbox' | 'radio' | 'range' | 'color';
  options: FilterOption[];
  expanded?: boolean;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface ActiveFilters {
  categories?: string[];
  priceRange?: PriceRange;
  attributes?: Record<string, string[]>;
  onSale?: boolean;
  inStock?: boolean;
}
