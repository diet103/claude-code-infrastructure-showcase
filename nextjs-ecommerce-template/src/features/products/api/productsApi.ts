/**
 * Products API Service
 *
 * Client-side service for fetching product data from API routes.
 * Follows the repository pattern - all data access goes through here.
 *
 * IMPORTANT:
 * - This runs on the client side
 * - Makes requests to /api/products/* routes
 * - Never directly accesses WooCommerce (that's server-side only)
 */

import type {
  Product,
  ProductFilters,
  ProductListResponse,
} from '../types';

const API_BASE = '/api/products';

/**
 * Build query string from filters
 */
const buildQueryString = (filters?: ProductFilters): string => {
  if (!filters) return '';

  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.category) params.append('category', filters.category);
  if (filters.minPrice !== undefined)
    params.append('minPrice', filters.minPrice.toString());
  if (filters.maxPrice !== undefined)
    params.append('maxPrice', filters.maxPrice.toString());
  if (filters.onSale !== undefined)
    params.append('onSale', filters.onSale.toString());
  if (filters.inStock !== undefined)
    params.append('inStock', filters.inStock.toString());
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.perPage) params.append('perPage', filters.perPage.toString());

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Fetch all products with optional filters
 */
export const getProducts = async (
  filters?: ProductFilters
): Promise<ProductListResponse> => {
  const queryString = buildQueryString(filters);
  const response = await fetch(`${API_BASE}${queryString}`);

  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }

  return response.json();
};

/**
 * Fetch a single product by ID
 */
export const getProduct = async (id: number): Promise<Product> => {
  const response = await fetch(`${API_BASE}/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch product ${id}`);
  }

  return response.json();
};

/**
 * Fetch a single product by slug
 */
export const getProductBySlug = async (slug: string): Promise<Product> => {
  const response = await fetch(`${API_BASE}/slug/${slug}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch product with slug ${slug}`);
  }

  return response.json();
};

/**
 * Search products
 */
export const searchProducts = async (query: string): Promise<Product[]> => {
  const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error('Failed to search products');
  }

  return response.json();
};

/**
 * Fetch featured products
 */
export const getFeaturedProducts = async (): Promise<Product[]> => {
  const response = await fetch(`${API_BASE}/featured`);

  if (!response.ok) {
    throw new Error('Failed to fetch featured products');
  }

  return response.json();
};

/**
 * Fetch products by category
 */
export const getProductsByCategory = async (
  categorySlug: string
): Promise<Product[]> => {
  const response = await fetch(`${API_BASE}/category/${categorySlug}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch products in category ${categorySlug}`);
  }

  return response.json();
};

export default {
  getProducts,
  getProduct,
  getProductBySlug,
  searchProducts,
  getFeaturedProducts,
  getProductsByCategory,
};
