/**
 * Stripe Client
 *
 * Server-side Stripe integration for payment processing.
 * Use only in API routes or server components.
 */

import Stripe from 'stripe';

/**
 * Get Stripe instance (server-side only)
 */
export const getStripeClient = (): Stripe => {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Stripe client should only be used server-side to protect API keys'
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      'Missing STRIPE_SECRET_KEY environment variable. Please check .env file.'
    );
  }

  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  });
};

/**
 * Create a payment intent
 */
export const createPaymentIntent = async (
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> => {
  const stripe = getStripeClient();

  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
};

/**
 * Create a checkout session
 */
export const createCheckoutSession = async (
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  options?: {
    successUrl?: string;
    cancelUrl?: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }
): Promise<Stripe.Checkout.Session> => {
  const stripe = getStripeClient();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: 'payment',
    success_url: options?.successUrl || `${baseUrl}/checkout/success`,
    cancel_url: options?.cancelUrl || `${baseUrl}/checkout/cancel`,
    customer_email: options?.customerEmail,
    metadata: options?.metadata,
  });
};

/**
 * Retrieve a payment intent
 */
export const retrievePaymentIntent = async (
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> => {
  const stripe = getStripeClient();
  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

/**
 * Verify webhook signature
 */
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string
): Stripe.Event => {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};

export default getStripeClient;
