import { NextResponse } from 'next/server';
import { stripe, LIFETIME_PRICE_CENTS } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, userEmail } = body;

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // If Stripe is not configured with an API key, provide a seamless test simulation
    if (!stripe) {
      return NextResponse.json({
        url: `${origin}/checkout/success?mock=true&user_id=${encodeURIComponent(userId || '')}`,
        isMock: true,
        message: 'Stripe API key not configured yet. Using sandbox test simulation.',
      });
    }

    // Create real Stripe Checkout Session for $29 one-time Lifetime Deal
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'BEATLAB Studio Suite – Lifetime Access',
              description: 'Lifetime access to all BEATLAB modules: Placement CRM, License Generator, Beat Catalog, Mailer, Lead Finder, Social Publisher, and Financial Analytics.',
            },
            unit_amount: LIFETIME_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      managed_payments: {
        enabled: false,
      },
      metadata: {
        userId: userId || '',
        userEmail: userEmail || '',
        plan: 'lifetime',
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&user_id=${encodeURIComponent(userId || '')}`,
      cancel_url: `${origin}/upgrade?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating Stripe Checkout session:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
