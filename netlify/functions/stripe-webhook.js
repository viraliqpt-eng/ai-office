const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return { statusCode: 503, body: 'Webhook não configurado' };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return { statusCode: 400, body: `Webhook Error: ${error.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      await supabase.from('payments').upsert({
        stripe_session_id: session.id,
        customer_email: session.customer_details?.email,
        amount_total: session.amount_total,
        currency: session.currency,
        status: session.payment_status,
        plan_name: session.metadata?.plan,
        billing_type: session.metadata?.billing,
        metadata: session.metadata
      }, { onConflict: 'stripe_session_id' });
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
