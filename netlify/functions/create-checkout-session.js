const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.URL) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Stripe não configurado' }) };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const payload = JSON.parse(event.body || '{}');

    const allowedPlans = {
      Starter: { single: 19900, monthly: 4900 },
      Business: { single: 39900, monthly: 9900 },
      Complete: { single: 69900, monthly: 24900 }
    };

    if (!allowedPlans[payload.plan] || !allowedPlans[payload.plan][payload.billing]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Plano inválido' }) };
    }

    const isSubscription = payload.billing === 'monthly';
    const amount = allowedPlans[payload.plan][payload.billing];

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      customer_email: payload.customer?.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: amount,
          recurring: isSubscription ? { interval: 'month' } : undefined,
          product_data: {
            name: `AI Office™ ${payload.plan}`,
            description: isSubscription ? 'Plano mensal AI Office™' : 'Serviço único AI Office™'
          }
        }
      }],
      metadata: {
        plan: payload.plan,
        billing: payload.billing,
        company: payload.customer?.company || '',
        nif: payload.customer?.nif || '',
        description: payload.customer?.description || ''
      },
      success_url: `${process.env.URL}/pagamento-sucesso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/pagamento-cancelado.html`,
      automatic_tax: { enabled: true }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
