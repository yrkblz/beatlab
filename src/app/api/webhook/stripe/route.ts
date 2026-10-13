import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');

  let event: any;

  try {
    const rawBody = await req.text();

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      // In development / testing without webhook secret
      event = JSON.parse(rawBody);
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle successful checkout session
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (userId) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            is_lifetime_paid: true,
            paid_at: new Date().toISOString(),
            stripe_customer_id: session.customer ? String(session.customer) : null,
            stripe_session_id: session.id,
          })
          .eq('id', userId);

        if (error) {
          console.error('Error updating profile in Supabase from webhook:', error);
        } else {
          console.log(`Successfully activated Lifetime Access for user ${userId}`);
        }
      } catch (dbErr) {
        console.error('Database update failed in webhook:', dbErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}
