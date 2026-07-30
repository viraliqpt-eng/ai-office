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

function makeTitle(text, attachment) {
  if (attachment?.name) return `Documento: ${attachment.name}`.slice(0, 70);
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 70) || 'Nova conversa';
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  for (const item of Array.isArray(data.output) ? data.output : []) {
    for (const content of Array.isArray(item.content) ? item.content : []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }
  return parts.join('\n').trim();
}

function buildInput(prompt, attachment) {
  const content = [{
    type: 'input_text',
    text: prompt || 'Analisa o documento anexado e apresenta um resumo estruturado.'
  }];

  if (!attachment) {
    return [{ role: 'user', content }];
  }

  const dataUrl = `data:${attachment.type || 'application/octet-stream'};base64,${attachment.data}`;

  if (String(attachment.type || '').startsWith('image/')) {
    content.push({
      type: 'input_image',
      image_url: dataUrl,
      detail: 'auto'
    });
  } else {
    content.push({
      type: 'input_file',
      filename: attachment.name || 'documento',
      file_data: dataUrl
    });
  }

  return [{ role: 'user', content }];
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Pedido inválido.' });
  }

  const prompt = String(payload.prompt || '').trim();
  const attachment = payload.attachment || null;

  if (!prompt && !attachment) {
    return json(400, { error: 'Escreva um pedido ou anexe um documento.' });
  }

  if (prompt.length > 4000) {
    return json(400, { error: 'O pedido não pode ultrapassar 4000 caracteres.' });
  }

  if (attachment) {
    if (!attachment.name || !attachment.data) {
      return json(400, { error: 'O documento anexado está incompleto.' });
    }

    const estimatedBytes = Math.ceil(String(attachment.data).length * 0.75);
    if (estimatedBytes > 4 * 1024 * 1024) {
      return json(413, { error: 'O documento excede o limite de 4 MB desta versão.' });
    }
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
  if (!token) return json(401, { error: 'Sessão inválida. Inicie sessão novamente.' });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json(401, { error: 'Não foi possível validar a sessão.' });

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

    if (!existing) return json(403, { error: 'Conversa inválida.' });
  } else {
    const { data: created, error: createError } = await supabase
      .from('ai_conversations')
      .insert({
        customer_id: customer.id,
        title: makeTitle(prompt, attachment),
        agent_type: payload.agent || 'general'
      })
      .select('id')
      .single();

    if (createError) return json(500, { error: 'Não foi possível criar a conversa.' });
    conversationId = created.id;
  }

  const apiKey = String(process.env.AI_API_KEY || '').trim();
  const model = String(process.env.AI_MODEL || 'gpt-5-mini').trim();
  if (!apiKey) return json(500, { error: 'A variável AI_API_KEY não está configurada.' });

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
          'Quando existir um documento, analisa apenas o que o documento suporta.',
          'Distingue claramente dados do documento de sugestões adicionais.',
          'Não inventes cláusulas, números, nomes ou conclusões ausentes.'
        ].join(' '),
        input: buildInput(prompt, attachment)
      })
    });

    const rawBody = await openaiResponse.text();
    let openaiData;

    try {
      openaiData = JSON.parse(rawBody);
    } catch {
      throw new Error(
        `A OpenAI devolveu uma resposta não reconhecida (${openaiResponse.status}).`
      );
    }

    if (!openaiResponse.ok) {
      throw new Error(
        openaiData?.error?.message ||
        openaiData?.message ||
        `Erro da OpenAI (${openaiResponse.status}).`
      );
    }

    answer = extractResponseText(openaiData);
    if (!answer) throw new Error('A OpenAI devolveu uma resposta vazia.');
  } catch (error) {
    return json(502, { error: error.message });
  }

  const { data: requestRow, error: saveError } = await supabase
    .from('ai_requests')
    .insert({
      customer_id: customer.id,
      conversation_id: conversationId,
      agent_type: payload.agent || 'general',
      prompt: prompt || `Documento anexado: ${attachment?.name || 'documento'}`,
      answer,
      status: 'completed'
    })
    .select('id')
    .single();

  if (saveError) {
    return json(500, { error: 'A resposta foi criada, mas não foi possível guardar a conversa.' });
  }

  if (attachment) {
    await supabase.from('ai_documents').insert({
      customer_id: customer.id,
      conversation_id: conversationId,
      request_id: requestRow?.id || null,
      filename: attachment.name,
      mime_type: attachment.type || null,
      file_size: attachment.size || null
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
    document: attachment ? {
      name: attachment.name,
      type: attachment.type,
      size: attachment.size
    } : null
  });
};
