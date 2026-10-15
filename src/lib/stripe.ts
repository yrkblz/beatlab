import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      appInfo: {
        name: 'BEATLAB Studio Suite',
        version: '1.0.0',
      },
    })
  : null;

export const LIFETIME_PRICE_USD = 1; // $1.00 USD (test price)
export const LIFETIME_PRICE_CENTS = 100; // 100 cents = $1.00 USD
