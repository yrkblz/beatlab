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

export const LIFETIME_PRICE_USD = 29; // $29 USD one-time
export const LIFETIME_PRICE_CENTS = 2900; // 2900 cents
