const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

function response(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  };
}

async function ensureCustomerAndOrder(supabase, session) {
  const metadata = session.metadata || {};
  const email = session.customer_details?.email || session.customer_email || null;
  const name = metadata.name || session.customer_details?.name || null;
  const company = metadata.company || null;
  const phone = metadata.phone || session.customer_details?.phone || null;

  let customerId = null;

  if (email) {
    const { data: existing, error: lookupError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) throw new Error(`Erro ao procurar cliente: ${lookupError.message}`);

    if (existing) {
      customerId = existing.id;
      const { error } = await supabase
        .from('customers')
        .update({
          full_name: name,
          company,
          phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) throw new Error(`Erro ao atualizar cliente: ${error.message}`);
    } else {
      const { data: created, error } = await supabase
        .from('customers')
        .insert({
          full_name: name,
          email,
          company,
          phone,
          nif: metadata.nif || null,
          sector: metadata.sector || null,
          status: 'ativo'
        })
        .select('id')
        .single();

      if (error) throw new Error(`Erro ao criar cliente: ${error.message}`);
      customerId = created.id;
    }
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .upsert({
      customer_id: customerId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
      customer_email: email,
      customer_name: name,
      company,
      plan_name: metadata.plan || null,
      billing_type: metadata.billing || null,
      amount_total: session.amount_total || 0,
      currency: session.currency || 'eur',
      payment_status: session.payment_status || 'paid',
      order_status: 'novo',
      description: metadata.description || null,
      metadata
    }, { onConflict: 'stripe_session_id' })
    .select('id')
    .single();

  if (orderError) throw new Error(`Erro ao criar pedido: ${orderError.message}`);

  const { error: paymentError } = await supabase
    .from('payments')
    .upsert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      customer_email: email,
      amount_total: session.amount_total || 0,
      currency: session.currency || 'eur',
      status: session.payment_status || 'paid',
      plan_name: metadata.plan || null,
      billing_type: metadata.billing || null,
      metadata
    }, { onConflict: 'stripe_session_id' });

  if (paymentError) throw new Error(`Erro ao registar pagamento: ${paymentError.message}`);

  const { error: taskError } = await supabase
    .from('tasks')
    .upsert({
      order_id: order.id,
      title: `Iniciar projeto ${metadata.plan || 'AI Office'}`,
      description: `Novo pagamento confirmado para ${company || name || email || 'cliente'}.`,
      status: 'por_iniciar',
      priority: metadata.plan === 'Complete' ? 'alta' : metadata.plan === 'Business' ? 'media' : 'normal',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    }, { onConflict: 'order_id' });

  if (taskError) throw new Error(`Erro ao criar tarefa: ${taskError.message}`);

  return { customerId, orderId: order.id };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Método não permitido.' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return response(503, { error: 'Webhook Stripe não configurado.' });
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
    console.error('[webhook:signature-error]', error.message);
    return response(400, { error: `Webhook Error: ${error.message}` });
  }

  console.log('[webhook:event]', JSON.stringify({
    id: stripeEvent.id,
    type: stripeEvent.type
  }));

  if (stripeEvent.type !== 'checkout.session.completed') {
    return response(200, { received: true, ignored: true });
  }

  const session = stripeEvent.data.object;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[webhook:supabase-missing] Pagamento confirmado sem persistência no Supabase.');
    return response(200, {
      received: true,
      stored: false,
      reason: 'Supabase não configurado'
    });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const result = await ensureCustomerAndOrder(supabase, session);

    console.log('[webhook:automation-complete]', JSON.stringify({
      stripeSessionId: session.id,
      customerId: result.customerId,
      orderId: result.orderId
    }));

    return response(200, {
      received: true,
      stored: true,
      customerId: result.customerId,
      orderId: result.orderId
    });
  } catch (error) {
    console.error('[webhook:automation-error]', error.message);
    return response(500, {
      error: 'Falha na automação pós-pagamento.',
      details: error.message
    });
  }
};
