/**
 * Products Feature Types
 *
 * Domain-specific types for the products feature.
 * These are simplified types for the frontend, mapped from WooCommerce types.
 */

/**
 * Simplified product type for frontend use
 */
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  regularPrice: number;
  salePrice: number | null;
  onSale: boolean;
  inStock: boolean;
  stockQuantity: number | null;
  sku: string;
  images: ProductImage[];
  categories: ProductCategory[];
  averageRating: number;
  ratingCount: number;
}

export interface ProductImage {
  id: number;
  src: string;
  alt: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
}

/**
 * Product list filters
 */
export interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  inStock?: boolean;
  sortBy?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'date-desc';
  page?: number;
  perPage?: number;
}

/**
 * Product list response
 */
export interface ProductListResponse {
  products: Product[];
  total: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Cart item
 */
export interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
  subtotal: number;
}

/**
 * Shopping cart
 */
export interface Cart {
  items: CartItem[];
  subtotal: number;
  total: number;
  itemCount: number;
}

/**
 * Filter types - Re-export from filters module
 */
export type {
  FilterOption,
  FilterGroup,
  PriceRange,
  ActiveFilters,
} from './filters';
