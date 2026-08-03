/**
 * WooCommerce API Client
 *
 * Type-safe client for interacting with WooCommerce REST API.
 * Follows repository pattern for data access.
 *
 * IMPORTANT: This should only be used server-side (API routes, server components)
 * to protect API credentials.
 */

import axios, { type AxiosInstance } from 'axios';
import type {
  WooCommerceProduct,
  WooCommerceOrder,
  WooCommerceCustomer,
  WooCommerceListParams,
  WooCommerceApiResponse,
  WooCommerceError,
} from './types';

/**
 * WooCommerce API Configuration
 */
interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  version?: string;
}

/**
 * WooCommerce API Client
 *
 * Provides methods for interacting with WooCommerce REST API.
 * All methods return typed responses.
 */
export class WooCommerceClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(config: WooCommerceConfig) {
    const { url, consumerKey, consumerSecret, version = 'wc/v3' } = config;

    this.baseURL = `${url}/wp-json/${version}`;

    this.client = axios.create({
      baseURL: this.baseURL,
      auth: {
        username: consumerKey,
        password: consumerSecret,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const wooError: WooCommerceError = {
          code: error.response?.data?.code || 'unknown_error',
          message: error.response?.data?.message || 'An unknown error occurred',
          data: {
            status: error.response?.status || 500,
          },
        };
        return Promise.reject(wooError);
      }
    );
  }

  /**
   * Products API
   */
  async getProducts(
    params?: WooCommerceListParams
  ): Promise<WooCommerceApiResponse<WooCommerceProduct[]>> {
    const response = await this.client.get<WooCommerceProduct[]>('/products', {
      params,
    });

    return {
      data: response.data,
      headers: {
        'x-wp-total': response.headers['x-wp-total'],
        'x-wp-totalpages': response.headers['x-wp-totalpages'],
      },
    };
  }

  async getProduct(id: number): Promise<WooCommerceProduct> {
    const response = await this.client.get<WooCommerceProduct>(
      `/products/${id}`
    );
    return response.data;
  }

  async getProductBySlug(slug: string): Promise<WooCommerceProduct | null> {
    const response = await this.client.get<WooCommerceProduct[]>('/products', {
      params: { slug },
    });
    return response.data[0] || null;
  }

  async createProduct(
    product: Partial<WooCommerceProduct>
  ): Promise<WooCommerceProduct> {
    const response = await this.client.post<WooCommerceProduct>(
      '/products',
      product
    );
    return response.data;
  }

  async updateProduct(
    id: number,
    updates: Partial<WooCommerceProduct>
  ): Promise<WooCommerceProduct> {
    const response = await this.client.put<WooCommerceProduct>(
      `/products/${id}`,
      updates
    );
    return response.data;
  }

  async deleteProduct(id: number): Promise<WooCommerceProduct> {
    const response = await this.client.delete<WooCommerceProduct>(
      `/products/${id}`,
      {
        params: { force: true },
      }
    );
    return response.data;
  }

  /**
   * Orders API
   */
  async getOrders(
    params?: WooCommerceListParams
  ): Promise<WooCommerceApiResponse<WooCommerceOrder[]>> {
    const response = await this.client.get<WooCommerceOrder[]>('/orders', {
      params,
    });

    return {
      data: response.data,
      headers: {
        'x-wp-total': response.headers['x-wp-total'],
        'x-wp-totalpages': response.headers['x-wp-totalpages'],
      },
    };
  }

  async getOrder(id: number): Promise<WooCommerceOrder> {
    const response = await this.client.get<WooCommerceOrder>(`/orders/${id}`);
    return response.data;
  }

  async createOrder(
    order: Partial<WooCommerceOrder>
  ): Promise<WooCommerceOrder> {
    const response = await this.client.post<WooCommerceOrder>(
      '/orders',
      order
    );
    return response.data;
  }

  async updateOrder(
    id: number,
    updates: Partial<WooCommerceOrder>
  ): Promise<WooCommerceOrder> {
    const response = await this.client.put<WooCommerceOrder>(
      `/orders/${id}`,
      updates
    );
    return response.data;
  }

  /**
   * Customers API
   */
  async getCustomers(
    params?: WooCommerceListParams
  ): Promise<WooCommerceApiResponse<WooCommerceCustomer[]>> {
    const response = await this.client.get<WooCommerceCustomer[]>(
      '/customers',
      {
        params,
      }
    );

    return {
      data: response.data,
      headers: {
        'x-wp-total': response.headers['x-wp-total'],
        'x-wp-totalpages': response.headers['x-wp-totalpages'],
      },
    };
  }

  async getCustomer(id: number): Promise<WooCommerceCustomer> {
    const response = await this.client.get<WooCommerceCustomer>(
      `/customers/${id}`
    );
    return response.data;
  }

  async createCustomer(
    customer: Partial<WooCommerceCustomer>
  ): Promise<WooCommerceCustomer> {
    const response = await this.client.post<WooCommerceCustomer>(
      '/customers',
      customer
    );
    return response.data;
  }

  async updateCustomer(
    id: number,
    updates: Partial<WooCommerceCustomer>
  ): Promise<WooCommerceCustomer> {
    const response = await this.client.put<WooCommerceCustomer>(
      `/customers/${id}`,
      updates
    );
    return response.data;
  }
}

/**
 * Create singleton instance
 * Only initialize on server-side
 */
let wooCommerceClient: WooCommerceClient | null = null;

export const getWooCommerceClient = (): WooCommerceClient => {
  if (typeof window !== 'undefined') {
    throw new Error(
      'WooCommerce client should only be used server-side to protect API credentials'
    );
  }

  if (!wooCommerceClient) {
    const url = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!url || !consumerKey || !consumerSecret) {
      throw new Error(
        'Missing required WooCommerce environment variables. Please check .env file.'
      );
    }

    wooCommerceClient = new WooCommerceClient({
      url,
      consumerKey,
      consumerSecret,
    });
  }

  return wooCommerceClient;
};

export default getWooCommerceClient;
