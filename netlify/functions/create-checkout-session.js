const Stripe = require('stripe');

const ALLOWED_PRICE_IDS = {
  price_1TwmBIEB68OLK6IRuQLwGYwz: { plan: 'Starter', billing: 'monthly' },
  price_1TwmDIEB68OLK6IRGCIH9tCc: { plan: 'Business', billing: 'monthly' },
  price_1TwmEeEB68OLK6IRmVaNkBgk: { plan: 'Complete', billing: 'monthly' },
  price_1TwmHQEB68OLK6IRzAG9JVTJ: { plan: 'Starter', billing: 'single' },
  price_1TwmIMEB68OLK6IR31qXD6L7: { plan: 'Business', billing: 'single' },
  price_1TwmJ3EB68OLK6IRrkIs9XLf: { plan: 'Complete', billing: 'single' }
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

exports.handler = async (event) => {
  const requestId = event.headers['x-nf-request-id'] || `req_${Date.now()}`;

  console.log('[checkout:start]', JSON.stringify({
    requestId,
    method: event.httpMethod,
    hasStripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
    hasSiteUrl: Boolean(process.env.URL)
  }));

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método não permitido.', requestId });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[checkout:config-error]', requestId, 'STRIPE_SECRET_KEY em falta');
    return json(503, {
      error: 'STRIPE_SECRET_KEY não está disponível na função Netlify.',
      requestId
    });
  }

  if (!process.env.URL) {
    console.error('[checkout:config-error]', requestId, 'URL em falta');
    return json(503, {
      error: 'A variável URL da Netlify não está disponível.',
      requestId
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    console.error('[checkout:json-error]', requestId, error.message);
    return json(400, {
      error: 'O pedido recebido não contém JSON válido.',
      details: error.message,
      requestId
    });
  }

  const priceConfig = ALLOWED_PRICE_IDS[payload.priceId];

  console.log('[checkout:payload]', JSON.stringify({
    requestId,
    plan: payload.plan,
    billing: payload.billing,
    priceId: payload.priceId,
    email: payload.customer?.email || null
  }));

  if (!priceConfig) {
    console.error('[checkout:price-error]', requestId, 'Price ID não permitido:', payload.priceId);
    return json(400, {
      error: 'Price ID inválido ou não autorizado.',
      details: String(payload.priceId || 'em falta'),
      requestId
    });
  }

  if (payload.plan !== priceConfig.plan || payload.billing !== priceConfig.billing) {
    console.error('[checkout:mismatch]', requestId, JSON.stringify({
      expected: priceConfig,
      received: { plan: payload.plan, billing: payload.billing }
    }));
    return json(400, {
      error: 'O plano escolhido não corresponde ao Price ID.',
      requestId
    });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const isSubscription = priceConfig.billing === 'monthly';

    // Confirm that the Price ID is visible to the configured Stripe account.
    const price = await stripe.prices.retrieve(payload.priceId);

    console.log('[checkout:price-found]', JSON.stringify({
      requestId,
      priceId: price.id,
      active: price.active,
      currency: price.currency,
      unitAmount: price.unit_amount,
      recurring: price.recurring?.interval || null,
      livemode: price.livemode
    }));

    if (!price.active) {
      return json(400, {
        error: 'O preço selecionado está inativo na Stripe.',
        requestId
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      customer_email: payload.customer?.email || undefined,
      line_items: [{ quantity: 1, price: payload.priceId }],
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
      cancel_url: `${process.env.URL}/pagamento-cancelado.html`
    });

    console.log('[checkout:session-created]', JSON.stringify({
      requestId,
      sessionId: session.id,
      mode: session.mode,
      urlCreated: Boolean(session.url)
    }));

    return json(200, {
      url: session.url,
      sessionId: session.id,
      requestId
    });
  } catch (error) {
    console.error('[checkout:stripe-error]', JSON.stringify({
      requestId,
      type: error.type || error.name,
      code: error.code || null,
      message: error.message,
      param: error.param || null,
      statusCode: error.statusCode || null
    }));

    return json(error.statusCode || 500, {
      error: 'A Stripe recusou a criação da sessão de pagamento.',
      details: error.message,
      type: error.type || error.name,
      code: error.code || null,
      requestId
    });
  }
};
