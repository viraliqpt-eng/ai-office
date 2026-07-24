const Stripe = require('stripe');

const ALLOWED_PRICE_IDS = {
  price_1TwmBIEB68OLK6IRuQLwGYwz: { plan: 'Starter', billing: 'monthly' },
  price_1TwmDIEB68OLK6IRGCIH9tCc: { plan: 'Business', billing: 'monthly' },
  price_1TwmEeEB68OLK6IRmVaNkBgk: { plan: 'Complete', billing: 'monthly' },
  price_1TwmHQEB68OLK6IRzAG9JVTJ: { plan: 'Starter', billing: 'single' },
  price_1TwmIMEB68OLK6IR31qXD6L7: { plan: 'Business', billing: 'single' },
  price_1TwmJ3EB68OLK6IRrkIs9XLf: { plan: 'Complete', billing: 'single' }
};

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
    const priceConfig = ALLOWED_PRICE_IDS[payload.priceId];

    if (!priceConfig) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Price ID inválido' }) };
    }

    if (payload.plan !== priceConfig.plan || payload.billing !== priceConfig.billing) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Plano incompatível com o Price ID' }) };
    }

    const isSubscription = priceConfig.billing === 'monthly';

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      customer_email: payload.customer?.email,
      line_items: [{
        quantity: 1,
        price: payload.priceId
      }],
      metadata: {
        plan: priceConfig.plan,
        billing: priceConfig.billing,
        company: payload.customer?.company || '',
        name: payload.customer?.name || '',
        phone: payload.customer?.phone || '',
        nif: payload.customer?.nif || '',
        sector: payload.customer?.sector || '',
        description: payload.customer?.description || ''
      },
      success_url: `${process.env.URL}/pagamento-sucesso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/pagamento-cancelado.html`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      tax_id_collection: { enabled: true },
      customer_creation: isSubscription ? undefined : 'always'
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
