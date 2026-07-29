const { createClient } = require('@supabase/supabase-js');

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

function makeTitle(text) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 70) || 'Nova conversa';
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data.output) ? data.output : [];
  const parts = [];

  for (const item of output) {
    if (!Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content && content.type === 'output_text' && typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }

  return parts.join('\n').trim();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método não permitido.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Pedido inválido.' });
  }

  const prompt = String(payload.prompt || '').trim();
  if (!prompt || prompt.length > 4000) {
    return json(400, { error: 'O pedido deve ter entre 1 e 4000 caracteres.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Supabase não configurado na Netlify.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return json(401, { error: 'Sessão inválida. Inicie sessão novamente.' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return json(401, { error: 'Não foi possível validar a sessão.' });
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, plan')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (customerError || !customer) {
    return json(403, { error: 'Perfil de cliente não encontrado.' });
  }

  const limits = { starter: 50, business: 250, complete: 1000 };
  const limit = limits[String(customer.plan || 'starter').toLowerCase()] || 50;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabase
    .from('ai_requests')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customer.id)
    .gte('created_at', monthStart);

  if ((count || 0) >= limit) {
    return json(429, { error: 'Atingiu o limite mensal do seu plano.' });
  }

  let conversationId = payload.conversationId || null;

  if (conversationId) {
    const { data: existing } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (!existing) {
      return json(403, { error: 'Conversa inválida.' });
    }
  } else {
    const { data: created, error: createError } = await supabase
      .from('ai_conversations')
      .insert({
        customer_id: customer.id,
        title: makeTitle(prompt),
        agent_type: payload.agent || 'general'
      })
      .select('id')
      .single();

    if (createError) {
      return json(500, { error: 'Não foi possível criar a conversa.' });
    }

    conversationId = created.id;
  }

  const apiKey = String(process.env.AI_API_KEY || '').trim();
  const model = String(process.env.AI_MODEL || 'gpt-5-mini').trim();

  if (!apiKey) {
    return json(500, { error: 'A variável AI_API_KEY não está configurada na Netlify.' });
  }

  let answer;

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        instructions: [
          'És o AI Office™ Intelligence.',
          'Responde sempre em português de Portugal.',
          'Age como um assistente empresarial profissional, claro e prático.',
          'Apresenta resultados prontos a utilizar e adapta a resposta ao tipo de assistente selecionado.'
        ].join(' '),
        input: prompt
      })
    });

    const rawBody = await openaiResponse.text();
    let openaiData = null;

    try {
      openaiData = JSON.parse(rawBody);
    } catch {
      const preview = rawBody.replace(/\s+/g, ' ').slice(0, 180);
      throw new Error(
        `A OpenAI devolveu uma resposta não reconhecida (${openaiResponse.status}). ` +
        `Confirme a chave e o modelo. Detalhe: ${preview}`
      );
    }

    if (!openaiResponse.ok) {
      const message =
        openaiData?.error?.message ||
        openaiData?.message ||
        `Erro da OpenAI (${openaiResponse.status}).`;
      throw new Error(message);
    }

    answer = extractResponseText(openaiData);

    if (!answer) {
      throw new Error('A OpenAI devolveu uma resposta vazia.');
    }
  } catch (error) {
    return json(502, { error: error.message });
  }

  const { error: saveError } = await supabase
    .from('ai_requests')
    .insert({
      customer_id: customer.id,
      conversation_id: conversationId,
      agent_type: payload.agent || 'general',
      prompt,
      answer,
      status: 'completed'
    });

  if (saveError) {
    return json(500, {
      error: 'A resposta foi criada, mas não foi possível guardar a conversa.'
    });
  }

  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('customer_id', customer.id);

  return json(200, {
    answer,
    conversationId,
    demo: false
  });
};
